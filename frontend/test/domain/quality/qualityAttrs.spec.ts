import { describe, it, expect } from "vitest";
import farganitePickaxe from "../../fixtures/items/farganite_pickaxe.json";
import tarsiliumBoots from "../../fixtures/items/tarsilium_toed_boots.json";
import cookedSquid from "../../fixtures/items/cooked_squid.json";
import spectralHuntingBow from "../../fixtures/items/spectral_hunting_bow.json";
import camel from "../../fixtures/pets/camel.json";
import {
  sumAttrs,
  sumBuffAttrs,
  usedAttrs,
  type GearItem,
  type PetItem,
} from "@/domain/quality/qualityAttrs";
import type { Attribute, Buff, GearItem, PetItem } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStat(
  attrs: ReturnType<typeof sumAttrs>,
  type: string,
  skillText: string,
) {
  return attrs.find(
    (a) => a.stats[0].type === type && a.skillText === skillText,
  );
}

// ---------------------------------------------------------------------------
// sumAttrs
// ---------------------------------------------------------------------------

describe("sumAttrs", () => {
  describe("gear item - common quality (no quality attrs applied)", () => {
    it("returns only base itemAttrs for farganite pickaxe", () => {
      const result = sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        farganitePickaxe.itemQualityAttrs as Attribute[],
        [],
        "common",
      );
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].type).toBe("workEfficiency");
      expect(result[0].stats[0].value).toBe(0.15);
    });

    it("returns all four base attrs for tarsilium boots", () => {
      const result = sumAttrs(
        tarsiliumBoots.itemAttrs as Attribute[],
        tarsiliumBoots.itemQualityAttrs as Attribute[],
        [],
        "common",
      );
      expect(result).toHaveLength(4);
      expect(getStat(result, "workEfficiency", "Mining")?.stats[0].value).toBe(
        0.04,
      );
      expect(
        getStat(result, "workEfficiency", "Smithing")?.stats[0].value,
      ).toBe(0.06);
      expect(getStat(result, "doubleAction", "Mining")?.stats[0].value).toBe(
        0.01,
      );
      expect(getStat(result, "doubleAction", "Smithing")?.stats[0].value).toBe(
        0.01,
      );
    });
  });

  describe("gear item - uncommon quality", () => {
    it("accumulates workEfficiency Mining from farganite base + uncommon tier", () => {
      const result = sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        farganitePickaxe.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      const stat = getStat(result, "workEfficiency", "Mining");
      // base 0.15 + uncommon bonus 0.03
      expect(stat?.stats[0].value).toBeCloseTo(0.18, 5);
    });

    it("adds new attrs (findGems, chestFind, etc.) from farganite uncommon tier", () => {
      const result = sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        farganitePickaxe.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      // base had 1 attr, uncommon adds 5 new attrs → total 6
      expect(result).toHaveLength(6);
      expect(getStat(result, "findGems", "Mining")?.stats[0].value).toBeCloseTo(
        0.21,
        5,
      );
      expect(
        getStat(result, "chestFind", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.18, 5);
      expect(
        getStat(result, "fineMaterialFind", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.21, 5);
      expect(
        getStat(result, "doubleRewards", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.03, 5);
      expect(
        getStat(result, "doubleAction", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.01, 5);
    });

    it("stacks doubleAction Mining on tarsilium boots (base + uncommon)", () => {
      const result = sumAttrs(
        tarsiliumBoots.itemAttrs as Attribute[],
        tarsiliumBoots.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      expect(result).toHaveLength(4);
      const doubleActionMining = getStat(result, "doubleAction", "Mining");
      // base 0.01 + uncommon 0.01 = 0.02
      expect(doubleActionMining?.stats[0].value).toBeCloseTo(0.02, 5);
    });

    it("stacks doubleAction Smithing on tarsilium boots (base + uncommon)", () => {
      const result = sumAttrs(
        tarsiliumBoots.itemAttrs as Attribute[],
        tarsiliumBoots.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      const doubleActionSmithing = getStat(result, "doubleAction", "Smithing");
      // base 0.01 + uncommon 0.0125 = 0.0225
      expect(doubleActionSmithing?.stats[0].value).toBeCloseTo(0.0225, 5);
    });

    it("leaves workEfficiency attrs unchanged on tarsilium boots (no quality bonus for them)", () => {
      const result = sumAttrs(
        tarsiliumBoots.itemAttrs as Attribute[],
        tarsiliumBoots.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      expect(
        getStat(result, "workEfficiency", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.04, 5);
      expect(
        getStat(result, "workEfficiency", "Smithing")?.stats[0].value,
      ).toBeCloseTo(0.06, 5);
    });
  });

  describe("gear item - rare quality (cumulative: uncommon + rare)", () => {
    it("accumulates workEfficiency Mining across base + uncommon + rare tiers", () => {
      const result = sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        farganitePickaxe.itemQualityAttrs as Attribute[],
        [],
        "rare",
      );
      const stat = getStat(result, "workEfficiency", "Mining");
      // base 0.15 + uncommon 0.03 + rare 0.05
      expect(stat?.stats[0].value).toBeCloseTo(0.23, 5);
    });
  });

  describe("consumable item - delegates to sumBuffAttrs", () => {
    it("returns normal buff attributes for consumableCommon quality", () => {
      const result = sumAttrs(
        cookedSquid.itemAttrs as Attribute[],
        cookedSquid.itemQualityAttrs as Attribute[],
        cookedSquid.buffs as Buff[],
        "consumableCommon",
      );
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].type).toBe("doubleAction");
      expect(result[0].stats[0].value).toBeCloseTo(0.08, 5);
    });

    it("returns fine buff attributes for consumableFine quality", () => {
      const result = sumAttrs(
        cookedSquid.itemAttrs as Attribute[],
        cookedSquid.itemQualityAttrs as Attribute[],
        cookedSquid.buffs as Buff[],
        "consumableFine",
      );
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].value).toBeCloseTo(0.16, 5);
    });
  });

  describe("gear item with two doubleRewards attrs - good (uncommon) quality", () => {
    it("returns both doubleRewards attrs at good quality", () => {
      const result = sumAttrs(
        spectralHuntingBow.itemAttrs as Attribute[],
        spectralHuntingBow.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      const doubleRewards = result.filter(
        (a) => a.stats[0].type === "doubleRewards" && a.skillText === "Hunting",
      );
      expect(doubleRewards).toHaveLength(2);
    });

    it("first doubleRewards (general hunting) has value 0.05 at good quality", () => {
      const result = sumAttrs(
        spectralHuntingBow.itemAttrs as Attribute[],
        spectralHuntingBow.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      const doubleRewards = result.filter(
        (a) => a.stats[0].type === "doubleRewards" && a.skillText === "Hunting",
      );
      // base 0.01 + uncommon bonus 0.04 = 0.05
      expect(doubleRewards[0].stats[0].value).toBeCloseTo(0.05, 5);
    });

    it("second doubleRewards (spectral locations) has value 0.07 at good quality", () => {
      const result = sumAttrs(
        spectralHuntingBow.itemAttrs as Attribute[],
        spectralHuntingBow.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      const doubleRewards = result.filter(
        (a) => a.stats[0].type === "doubleRewards" && a.skillText === "Hunting",
      );
      // base 0.07, quality bonus applies only to first matching attr
      expect(doubleRewards[1].stats[0].value).toBeCloseTo(0.07, 5);
    });
  });

  describe("empty qualityAttrs", () => {
    it("returns just base attrs when qualityAttrs is empty array", () => {
      const result = sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        [],
        [],
        "uncommon",
      );
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].value).toBe(0.15);
    });

    it("returns just base attrs when qualityAttrs is undefined", () => {
      const result = sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        undefined,
        [],
        "uncommon",
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("mutation isolation", () => {
    it("does not mutate the original itemAttrs input across repeated calls", () => {
      const originalValue = farganitePickaxe.itemAttrs[0].stats[0].value;
      sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        farganitePickaxe.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      sumAttrs(
        farganitePickaxe.itemAttrs as Attribute[],
        farganitePickaxe.itemQualityAttrs as Attribute[],
        [],
        "uncommon",
      );
      expect(farganitePickaxe.itemAttrs[0].stats[0].value).toBe(originalValue);
    });
  });
});

// ---------------------------------------------------------------------------
// sumBuffAttrs
// ---------------------------------------------------------------------------

describe("sumBuffAttrs", () => {
  it("returns normal attributes for consumableCommon quality", () => {
    const result = sumBuffAttrs(
      cookedSquid.buffs as Buff[],
      "consumableCommon",
    );
    expect(result).toHaveLength(1);
    expect(result[0].stats[0].type).toBe("doubleAction");
    expect(result[0].stats[0].value).toBeCloseTo(0.08, 5);
  });

  it("returns fine attributes for consumableFine quality", () => {
    const result = sumBuffAttrs(cookedSquid.buffs as Buff[], "consumableFine");
    expect(result).toHaveLength(1);
    expect(result[0].stats[0].type).toBe("doubleAction");
    expect(result[0].stats[0].value).toBeCloseTo(0.16, 5);
  });

  it("returns empty array when buffs array is empty", () => {
    expect(sumBuffAttrs([], "consumableCommon")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// usedAttrs
// ---------------------------------------------------------------------------

describe("usedAttrs", () => {
  describe("gear items", () => {
    it("returns base attrs for farganite pickaxe at common quality", () => {
      const result = usedAttrs(farganitePickaxe as GearItem, "common");
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].value).toBe(0.15);
    });

    it("returns accumulated attrs for farganite pickaxe at uncommon quality", () => {
      const result = usedAttrs(farganitePickaxe as GearItem, "uncommon");
      expect(result).toHaveLength(6);
      expect(
        getStat(result, "workEfficiency", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.18, 5);
    });

    it("returns correct attrs for tarsilium boots at uncommon quality", () => {
      const result = usedAttrs(tarsiliumBoots as GearItem, "uncommon");
      expect(result).toHaveLength(4);
      expect(
        getStat(result, "doubleAction", "Mining")?.stats[0].value,
      ).toBeCloseTo(0.02, 5);
    });
  });

  describe("consumable items", () => {
    it("returns normal buff attrs for consumableCommon quality", () => {
      const result = usedAttrs(cookedSquid as GearItem, "consumableCommon");
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].value).toBeCloseTo(0.08, 5);
    });

    it("returns fine buff attrs for consumableFine quality", () => {
      const result = usedAttrs(cookedSquid as GearItem, "consumableFine");
      expect(result).toHaveLength(1);
      expect(result[0].stats[0].value).toBeCloseTo(0.16, 5);
    });
  });

  describe("pet items", () => {
    it("returns empty array for quality 0 (no level selected)", () => {
      const result = usedAttrs(camel as PetItem, "0");
      expect(result).toEqual([]);
    });

    it("returns level 1 attributes for camel at quality '1'", () => {
      const result = usedAttrs(camel as PetItem, "1");
      expect(result).toHaveLength(4);
    });

    it("returns correct stat values for camel at level 1", () => {
      const result = usedAttrs(camel as PetItem, "1");
      const workEffGathering = result.find(
        (a) =>
          a.stats[0].type === "workEfficiency" && a.stats[0].value === -0.3,
      );
      expect(workEffGathering).toBeDefined();
      expect(workEffGathering?.stats[0].isNegative).toBe(true);
    });

    it("returns level 2 attributes for camel at quality '2'", () => {
      const result = usedAttrs(camel as PetItem, "2");
      expect(result).toHaveLength(4);
      // Level 2 has improved values vs level 1
      const workEffGathering = result.find(
        (a) =>
          a.stats[0].type === "workEfficiency" &&
          a.stats[0].isNegative === true,
      );
      // Level 2 gathering penalty is -0.15 (improved from -0.3 at level 1)
      expect(workEffGathering?.stats[0].value).toBeCloseTo(-0.15, 5);
    });

    it("never applies quality tier attrs for pets (no itemQualityAttrs)", () => {
      const result1 = usedAttrs(camel as PetItem, "1");
      const result2 = usedAttrs(camel as PetItem, "2");
      // Pet levels return raw level attributes, not quality-stacked ones
      expect(result1).toHaveLength(4);
      expect(result2).toHaveLength(4);
    });
  });
});
