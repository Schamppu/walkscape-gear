import { describe, it, expect } from "vitest";
import { resolveDisplayAttrs } from "@/domain/stats/itemStatDisplay";
import type { GearItem, Attribute, Stat } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStat(overrides: Partial<Stat> = {}): Stat {
  return {
    stat: "work_efficiency",
    name: "Work Efficiency",
    type: "workEfficiency",
    isPercent: true,
    value: 0.05,
    isNegative: false,
    isMultiplicative: false,
    ...overrides,
  };
}

function makeAttr(overrides: Partial<Attribute> = {}): Attribute {
  return {
    id: "attr_we",
    customIcon: null,
    customTextLocalizationKey: null,
    customText: "",
    textLocalizationKey: "attr.we",
    text: "+5% Work Efficiency",
    statText: "+5%",
    skillText: "",
    tables: null,
    requirements: [],
    stats: [makeStat()],
    ...overrides,
  };
}

function makeItem(attrs: Attribute[]): GearItem {
  return { itemAttrs: attrs, itemQualityAttrs: [] };
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("resolveDisplayAttrs — edge cases", () => {
  it("returns [] for an item with no attributes", () => {
    expect(resolveDisplayAttrs(makeItem([]), "common")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Basic resolution
// ---------------------------------------------------------------------------

describe("resolveDisplayAttrs — basic resolution", () => {
  it("returns one entry per stat", () => {
    const item = makeItem([makeAttr()]);
    expect(resolveDisplayAttrs(item, "common")).toHaveLength(1);
  });

  it("each entry contains the stat, empty requirements, and data", () => {
    const item = makeItem([makeAttr()]);
    const [entry] = resolveDisplayAttrs(item, "common");
    expect(entry.stat.type).toBe("workEfficiency");
    expect(entry.requirements).toEqual([]);
    expect(entry.data).toHaveProperty("stats");
    expect(entry.data).toHaveProperty("requirements");
  });

  it("flattens multiple stats in one attribute into separate entries", () => {
    const attr = makeAttr({
      stats: [makeStat({ type: "workEfficiency" }), makeStat({ type: "doubleAction" })],
    });
    const result = resolveDisplayAttrs(makeItem([attr]), "common");
    expect(result).toHaveLength(2);
    expect(result[0].stat.type).toBe("workEfficiency");
    expect(result[1].stat.type).toBe("doubleAction");
  });

  it("flattens stats from multiple attributes", () => {
    const attrs = [makeAttr(), makeAttr({ id: "attr_da", stats: [makeStat({ type: "doubleAction" })] })];
    expect(resolveDisplayAttrs(makeItem(attrs), "common")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// roll_special_table override
// ---------------------------------------------------------------------------

describe("resolveDisplayAttrs — roll_special_table override", () => {
  it("sets stat.name to the attribute customText for roll_special_table stats", () => {
    const attr = makeAttr({
      customText: "Find Treasure",
      stats: [makeStat({ stat: "roll_special_table", type: "rollSpecialTable", name: "" })],
    });
    const [entry] = resolveDisplayAttrs(makeItem([attr]), "common");
    expect(entry.stat.name).toBe("Find Treasure");
  });

  it("sets stat.customIcon to the attribute customIcon for roll_special_table stats", () => {
    const attr = makeAttr({
      customIcon: "icons/treasure.png",
      customText: "Find Treasure",
      stats: [makeStat({ stat: "roll_special_table", type: "rollSpecialTable", name: "" })],
    });
    const [entry] = resolveDisplayAttrs(makeItem([attr]), "common");
    expect(entry.stat.customIcon).toBe("icons/treasure.png");
  });

  it("does not add customIcon to non-roll_special_table stats", () => {
    const item = makeItem([makeAttr()]);
    const [entry] = resolveDisplayAttrs(item, "common");
    expect(entry.stat).not.toHaveProperty("customIcon");
  });

  it("does not mutate the original attribute stats", () => {
    const originalName = "Original";
    const attr = makeAttr({
      customText: "Override",
      stats: [makeStat({ stat: "roll_special_table", name: originalName })],
    });
    resolveDisplayAttrs(makeItem([attr]), "common");
    // usedAttrs deep-clones, so original should be unchanged
    expect(attr.stats[0].name).toBe(originalName);
  });
});

// ---------------------------------------------------------------------------
// filterStat
// ---------------------------------------------------------------------------

describe("resolveDisplayAttrs — filterStat", () => {
  it("returns all entries when filterStat is undefined", () => {
    const attrs = [
      makeAttr({ stats: [makeStat({ type: "workEfficiency" })] }),
      makeAttr({ stats: [makeStat({ type: "doubleAction" })] }),
    ];
    expect(resolveDisplayAttrs(makeItem(attrs), "common")).toHaveLength(2);
  });

  it("returns all entries when filterStat is empty string", () => {
    const attrs = [
      makeAttr({ stats: [makeStat({ type: "workEfficiency" })] }),
      makeAttr({ stats: [makeStat({ type: "doubleAction" })] }),
    ];
    expect(resolveDisplayAttrs(makeItem(attrs), "common", "")).toHaveLength(2);
  });

  it("returns only entries matching the filterStat type", () => {
    const attrs = [
      makeAttr({ stats: [makeStat({ type: "workEfficiency" })] }),
      makeAttr({ stats: [makeStat({ type: "doubleAction" })] }),
    ];
    const result = resolveDisplayAttrs(makeItem(attrs), "common", "doubleAction");
    expect(result).toHaveLength(1);
    expect(result[0].stat.type).toBe("doubleAction");
  });

  it("returns [] when filterStat matches nothing", () => {
    const item = makeItem([makeAttr()]);
    expect(resolveDisplayAttrs(item, "common", "nonExistentStat")).toHaveLength(0);
  });
});
