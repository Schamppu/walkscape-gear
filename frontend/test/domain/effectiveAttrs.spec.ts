import { describe, it, expect } from "vitest";
import {
  resolveItemAttrs,
  buildAllAttrEntries,
  calculateStatTotals,
  type EffectiveAttrEntry,
} from "@/domain/effectiveAttrs";
import type { ItemDetail } from "@/domain/types/item";
import type { LevelBonusAttr } from "@/domain/levelBonus";
import type { ServiceDetail } from "@/domain/types/service";
import craftingGear from "../fixtures/gear/crafting_equipped_gear.json";
import allCollectibles from "../fixtures/gear/all_collectibles.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal EffectiveAttrEntry with a single stat for use in calculateStatTotals tests. */
function makeEntry(
  type: string,
  value: number,
  isPercent: boolean,
  isNegative: boolean,
): EffectiveAttrEntry {
  return {
    requirements: [],
    item: { id: "test", name: "Test", icon: "" },
    stats: [
      {
        stat: type,
        name: type,
        type,
        isPercent,
        value,
        isNegative,
        isMultiplicative: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// resolveItemAttrs
// ---------------------------------------------------------------------------

describe("resolveItemAttrs", () => {
  it("returns an empty array for empty input", () => {
    expect(resolveItemAttrs([])).toEqual([]);
  });

  it("includes pickles even though itemAttrs is empty - usedAttrs resolves its buff attributes", () => {
    const result = resolveItemAttrs(craftingGear as ItemDetail[]);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("pickles");
  });

  it("returns all 16 items from the crafting gear fixture", () => {
    const result = resolveItemAttrs(craftingGear as ItemDetail[]);
    expect(result).toHaveLength(16);
  });

  it("each resolved item has id, name, icon, and a non-empty attrs array", () => {
    const result = resolveItemAttrs(craftingGear as ItemDetail[]);
    for (const item of result) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.name).toBe("string");
      expect(typeof item.icon).toBe("string");
      expect(item.attrs.length).toBeGreaterThan(0);
    }
  });

  it("correctly maps id/name/icon from the source item", () => {
    const result = resolveItemAttrs(craftingGear as ItemDetail[]);
    const candlehat = result.find((r) => r.id === "candlehat");
    expect(candlehat).toBeDefined();
    expect(candlehat!.name).toBe("Candlehat");
    expect(candlehat!.icon).toBe(
      "assets/icons/items/gear/skill_gear/candlehat.png",
    );
  });

  it("candlehat (legendary, no quality attrs) exposes 2 usable attrs", () => {
    const result = resolveItemAttrs(craftingGear as ItemDetail[]);
    const candlehat = result.find((r) => r.id === "candlehat");
    expect(candlehat!.attrs).toHaveLength(2);
  });

  it("resolves collectibles that have itemAttrs", () => {
    const result = resolveItemAttrs(allCollectibles as ItemDetail[]);
    // 16 of the collectibles in the fixture have itemAttrs
    const ids = result.map((r) => r.id);
    expect(ids).toContain("ancient_ankh");
    expect(ids).not.toContain("western_continent_boat_pass");
  });

  it("filters out all collectibles with empty itemAttrs", () => {
    const result = resolveItemAttrs(allCollectibles as ItemDetail[]);
    for (const item of result) {
      expect(item.attrs.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// buildAllAttrEntries
// ---------------------------------------------------------------------------

describe("buildAllAttrEntries", () => {
  const resolvedGear = resolveItemAttrs(craftingGear as ItemDetail[]);

  it("returns an empty array when given no items and no bonuses/service", () => {
    const result = buildAllAttrEntries([], null, null, null);
    expect(result).toEqual([]);
  });

  it("produces one entry per usable attr across all resolved items (52 total: 51 gear + 1 pickles buff)", () => {
    const result = buildAllAttrEntries(resolvedGear, null, null, null);
    expect(result).toHaveLength(52);
  });

  it("each entry carries the correct item reference", () => {
    const result = buildAllAttrEntries(resolvedGear, null, null, null);
    const candlehatEntries = result.filter((e) => e.item.id === "candlehat");
    expect(candlehatEntries).toHaveLength(2);
    expect(candlehatEntries[0].item.name).toBe("Candlehat");
    expect(candlehatEntries[0].item.icon).toBe(
      "assets/icons/items/gear/skill_gear/candlehat.png",
    );
  });

  it("converts rollSpecialTable attrs to pseudo-stats (type is no longer rollSpecialTable)", () => {
    const result = buildAllAttrEntries(resolvedGear, null, null, null);
    const hasRollSpecial = result.some(
      (e) => e.stats[0]?.type === "rollSpecialTable",
    );
    expect(hasRollSpecial).toBe(false);
  });

  it("sticky_finger_shorts rollSpecialTable becomes trashTable pseudo-stat", () => {
    const result = buildAllAttrEntries(resolvedGear, null, null, null);
    const entry = result.find(
      (e) => e.item.id === "sticky_finger_shorts" && e.stats[0]?.type !== "chestFind",
    );
    expect(entry).toBeDefined();
    expect(entry!.stats[0].type).toBe("trashTable");
  });

  it("spectral_wrench rollSpecialTable becomes findEcto pseudo-stat", () => {
    const result = buildAllAttrEntries(resolvedGear, null, null, null);
    const entry = result.find(
      (e) => e.item.id === "spectral_wrench" && e.stats[0]?.type === "findEcto",
    );
    expect(entry).toBeDefined();
  });

  it("appends the workEfficiencyBonus entry when provided", () => {
    const bonus: LevelBonusAttr = {
      id: "level-bonus-work",
      requirements: [],
      tables: null,
      item: { id: "level-bonus", name: "Level Bonus", icon: "" },
      stats: [
        {
          stat: "work_efficiency",
          name: "Work efficiency",
          type: "workEfficiency",
          isPercent: true,
          value: 0.05,
          isNegative: false,
          isMultiplicative: true,
        },
      ],
    };
    const result = buildAllAttrEntries(resolvedGear, bonus, null, null);
    expect(result).toHaveLength(53);
    const bonusEntry = result.find((e) => e.item.id === "level-bonus");
    expect(bonusEntry).toBeDefined();
    expect(bonusEntry!.stats[0].type).toBe("workEfficiency");
    expect(bonusEntry!.stats[0].value).toBe(0.05);
  });

  it("appends the qualityOutcomeBonus entry when provided", () => {
    const bonus: LevelBonusAttr = {
      id: "level-bonus-qo",
      requirements: [],
      tables: null,
      item: { id: "level-bonus-qo", name: "Quality Bonus", icon: "" },
      stats: [
        {
          stat: "quality_outcome",
          name: "Quality outcome",
          type: "qualityOutcome",
          isPercent: false,
          value: 10,
          isNegative: false,
          isMultiplicative: true,
        },
      ],
    };
    const result = buildAllAttrEntries(resolvedGear, null, bonus, null);
    expect(result).toHaveLength(53);
    const bonusEntry = result.find((e) => e.item.id === "level-bonus-qo");
    expect(bonusEntry).toBeDefined();
    expect(bonusEntry!.stats[0].value).toBe(10);
  });

  it("appends both level bonuses when both are provided", () => {
    const workBonus: LevelBonusAttr = {
      id: "wb",
      requirements: [],
      tables: null,
      item: { id: "wb", name: "Work Bonus", icon: "" },
      stats: [{ stat: "we", name: "", type: "workEfficiency", isPercent: true, value: 0.01, isNegative: false, isMultiplicative: true }],
    };
    const qoBonus: LevelBonusAttr = {
      id: "qob",
      requirements: [],
      tables: null,
      item: { id: "qob", name: "QO Bonus", icon: "" },
      stats: [{ stat: "qo", name: "", type: "qualityOutcome", isPercent: false, value: 5, isNegative: false, isMultiplicative: true }],
    };
    const result = buildAllAttrEntries(resolvedGear, workBonus, qoBonus, null);
    expect(result).toHaveLength(54);
  });

  it("appends service attributes and sets item to the service object", () => {
    const service: ServiceDetail = {
      id: "service-1",
      name: "Crafting Service",
      icon: "assets/service.png",
      tier: "basic",
      serviceType: "crafting",
      keywords: [],
      relatedSkills: [],
      requirements: [],
      attributes: [
        {
          id: "svc-attr-1",
          customIcon: null,
          customTextLocalizationKey: null,
          customText: "",
          textLocalizationKey: "",
          text: "",
          statText: "Quality outcome",
          skillText: "",
          tables: null,
          requirements: [],
          stats: [
            {
              stat: "quality_outcome",
              name: "Quality outcome",
              type: "qualityOutcome",
              isPercent: false,
              value: 15,
              isNegative: false,
              isMultiplicative: true,
            },
          ],
        },
      ],
    };
    const result = buildAllAttrEntries(resolvedGear, null, null, service);
    expect(result).toHaveLength(53);
    const svcEntry = result.find((e) => e.item.id === "service-1");
    expect(svcEntry).toBeDefined();
    expect(svcEntry!.item.name).toBe("Crafting Service");
    expect(svcEntry!.stats[0].value).toBe(15);
  });

  it("does not append service when service has no attributes", () => {
    const emptyService: ServiceDetail = {
      id: "svc-empty",
      name: "Empty Service",
      icon: "",
      tier: "basic",
      serviceType: "crafting",
      keywords: [],
      relatedSkills: [],
      requirements: [],
      attributes: [],
    };
    const result = buildAllAttrEntries(resolvedGear, null, null, emptyService);
    expect(result).toHaveLength(52);
  });
});

// ---------------------------------------------------------------------------
// calculateStatTotals
// ---------------------------------------------------------------------------

describe("calculateStatTotals", () => {
  it("returns an empty object for an empty entries array", () => {
    expect(calculateStatTotals([])).toEqual({});
  });

  it("accumulates a single flat positive stat correctly", () => {
    const totals = calculateStatTotals([makeEntry("stepsRequired", 1, false, false)]);
    expect(totals.stepsRequired.flat.sum).toBe(1);
    expect(totals.stepsRequired.flat.positive).toBe(1);
    expect(totals.stepsRequired.flat.negative).toBe(0);
    expect(totals.stepsRequired.percent.sum).toBe(0);
  });

  it("accumulates a single percent positive stat correctly", () => {
    const totals = calculateStatTotals([makeEntry("workEfficiency", 0.2, true, false)]);
    expect(totals.workEfficiency.percent.sum).toBeCloseTo(0.2);
    expect(totals.workEfficiency.percent.positive).toBeCloseTo(0.2);
    expect(totals.workEfficiency.percent.negative).toBe(0);
    expect(totals.workEfficiency.flat.sum).toBe(0);
  });

  it("routes isNegative=true entries to the negative bucket", () => {
    const totals = calculateStatTotals([makeEntry("workEfficiency", -0.7, true, true)]);
    expect(totals.workEfficiency.percent.negative).toBeCloseTo(-0.7);
    expect(totals.workEfficiency.percent.positive).toBe(0);
    expect(totals.workEfficiency.percent.sum).toBeCloseTo(-0.7);
  });

  it("sums multiple entries of the same stat type and bucket", () => {
    const entries = [
      makeEntry("qualityOutcome", 30, false, false),
      makeEntry("qualityOutcome", 20, false, false),
      makeEntry("qualityOutcome", 9, false, false),
    ];
    const totals = calculateStatTotals(entries);
    expect(totals.qualityOutcome.flat.sum).toBeCloseTo(59);
    expect(totals.qualityOutcome.flat.positive).toBeCloseTo(59);
    expect(totals.qualityOutcome.flat.negative).toBe(0);
  });

  it("keeps flat and percent buckets separate for the same stat type", () => {
    const entries = [
      makeEntry("workEfficiency", 1, false, false),  // flat
      makeEntry("workEfficiency", 0.5, true, false),  // percent
    ];
    const totals = calculateStatTotals(entries);
    expect(totals.workEfficiency.flat.sum).toBeCloseTo(1);
    expect(totals.workEfficiency.percent.sum).toBeCloseTo(0.5);
  });

  it("tracks multiple distinct stat types independently", () => {
    const entries = [
      makeEntry("workEfficiency", 0.2, true, false),
      makeEntry("qualityOutcome", 30, false, false),
      makeEntry("chestFind", 0.05, true, false),
    ];
    const totals = calculateStatTotals(entries);
    expect(Object.keys(totals)).toHaveLength(3);
    expect(totals.workEfficiency.percent.sum).toBeCloseTo(0.2);
    expect(totals.qualityOutcome.flat.sum).toBeCloseTo(30);
    expect(totals.chestFind.percent.sum).toBeCloseTo(0.05);
  });

  it("correctly mixes positive and negative values for the same stat", () => {
    const entries = [
      makeEntry("workEfficiency", 0.55, true, false),
      makeEntry("workEfficiency", -0.7, true, true),
    ];
    const totals = calculateStatTotals(entries);
    expect(totals.workEfficiency.percent.sum).toBeCloseTo(-0.15);
    expect(totals.workEfficiency.percent.positive).toBeCloseTo(0.55);
    expect(totals.workEfficiency.percent.negative).toBeCloseTo(-0.7);
  });

  describe("full crafting gear fixture pipeline", () => {
    const allEntries = buildAllAttrEntries(
      resolveItemAttrs(craftingGear as ItemDetail[]),
      null,
      null,
      null,
    );
    const totals = calculateStatTotals(allEntries);

    it("does not contain a rollSpecialTable stat key (converted to pseudo-stats)", () => {
      expect(totals["rollSpecialTable"]).toBeUndefined();
    });

    it("flat qualityOutcome sums correctly across all gear (includes quality-tier bonuses)", () => {
      // base from itemAttrs: candlehat(30) + cape(20) + crafting_shirt(9) +
      //   spectral_wrench(4) + crafting_guidebook(20) + wire_saw(6) = 89
      // plus extra from quality-tier attrs on amulet/rings/spectral_wrench → 113
      expect(totals.qualityOutcome.flat.sum).toBeCloseTo(113);
      expect(totals.qualityOutcome.flat.positive).toBeCloseTo(113);
      expect(totals.qualityOutcome.flat.negative).toBe(0);
    });

    it("flat inventorySpace sums correctly (includes quality-tier bonuses from rings/amulet)", () => {
      // base: cape(2) + ring_legendary(1) + ring_ethereal(1) + zip_pouch(3) = 7
      // plus extra from quality-tier attrs on rings → 12
      expect(totals.inventorySpace.flat.sum).toBeCloseTo(12);
    });

    it("percent workEfficiency positive/negative/sum are correct", () => {
      // positive: cape(0.2) + shirt(0.07) + skis(0.12+0.35) + wire_saw(0.16+0.08) = 0.98
      // negative: spectral_wrench quality-stacked (~-0.1) + guidebook(-0.15) = -0.25
      // sum = 0.98 + (-0.25) = 0.73
      // note: not what real WE would be due to not checking requirements on items
      expect(totals.workEfficiency.percent.positive).toBeCloseTo(0.98);
      expect(totals.workEfficiency.percent.negative).toBeCloseTo(-0.25);
      expect(totals.workEfficiency.percent.sum).toBeCloseTo(0.73);
    });

    it("flat stepsRequired is negative across all items (includes quality-tier bonuses)", () => {
      // cape(-5) + amulet base(-1) + skis(-1) = -7, plus amulet quality tier adds -1 → -8
      expect(totals.stepsRequired.flat.sum).toBeCloseTo(-8);
    });

    it("correctly combines pseudo-stats from rollSpecialTable attrs across multiple items", () => {
      // findEcto: accumulated from spectral wrench: 0.15
      expect(totals.findEcto.percent.sum).toBeCloseTo(0.15);
      // trashTable: trash grabber + sticky finger shorts: 0.05 + 0.02 = 0.07
      expect(totals.trashTable.percent.sum).toBeCloseTo(0.07);
    });
  });
});
