import { describe, it, expect } from "vitest";
import {
  filterUsefulAbilities,
  filterUsefulKeywords,
  filterUsefulAttrs,
} from "@/domain/gear/itemActivity";
import type {
  ItemForActivity,
  SourceForItem,
  AttrFilterOptions,
} from "@/domain/gear/itemActivity";
import type { Attribute, Stat } from "@/domain/types/item";
import type { Requirement } from "@/domain/types/requirement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<ItemForActivity> = {}): ItemForActivity {
  return { quality: "common", ...overrides };
}

function makeStat(overrides: Partial<Stat> = {}): Stat {
  return {
    stat: "work_efficiency",
    name: "Work efficiency",
    type: "workEfficiency",
    isPercent: false,
    value: 1,
    isNegative: false,
    isMultiplicative: false,
    ...overrides,
  };
}

function makeAttr(
  statText: string,
  stats: Partial<Stat>[] = [],
  opts: { requirements?: Requirement[] } = {},
): Attribute {
  const attrStats: Stat[] =
    stats.length > 0
      ? stats.map((s) => makeStat(s))
      : [makeStat({ name: statText })];
  return {
    id: `attr-${statText}`,
    customIcon: null,
    customTextLocalizationKey: null,
    customText: statText,
    textLocalizationKey: "",
    text: statText,
    statText,
    skillText: "",
    tables: null,
    requirements: opts.requirements ?? [],
    stats: attrStats,
  };
}

function makeActivityOptions(
  overrides: Partial<AttrFilterOptions> = {},
): AttrFilterOptions {
  return {
    isRecipe: false,
    hasCollectibleDrops: true,
    hasFineDrops: true,
    hideInventoryAttr: false,
    craftedRewardItemIds: [],
    checkRequirements: () => true,
    ...overrides,
  };
}

function abilityAvailableReq(ability: string): Requirement {
  return {
    type: "abilityAvailable",
    name: null,
    opposite: false,
    requirement: { ability, scanEquippedItems: false },
  };
}

function keywordEquippedReq(keyword: string): Requirement {
  return {
    type: "keywordEquipped",
    name: null,
    opposite: false,
    requirement: { keyword },
  };
}

function distinctKeywordReq(keywords: string[], quantity: number): Requirement {
  return {
    type: "distinctKeywordItemsEquipped",
    name: null,
    opposite: false,
    requirement: { keywords, quantity },
  };
}

// ---------------------------------------------------------------------------
// filterUsefulAbilities
// ---------------------------------------------------------------------------

describe("filterUsefulAbilities", () => {
  it("returns [] when item has no abilities", () => {
    const item = makeItem({ abilities: [] });
    const source: SourceForItem = {
      requirements: [abilityAvailableReq("haste")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual([]);
  });

  it("returns [] when source has no abilityAvailable requirements", () => {
    const item = makeItem({ abilities: ["haste"] });
    const source: SourceForItem = {
      requirements: [keywordEquippedReq("axe")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual([]);
  });

  it("returns the matching ability name for a plain string ability", () => {
    const item = makeItem({ abilities: ["haste"] });
    const source: SourceForItem = {
      requirements: [abilityAvailableReq("haste")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual(["haste"]);
  });

  it("includes an object ability when item level meets the unlock level", () => {
    const item = makeItem({
      level: 5,
      abilities: [{ ability: "haste", unlockLevel: 3 }],
    });
    const source: SourceForItem = {
      requirements: [abilityAvailableReq("haste")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual(["haste"]);
  });

  it("excludes an object ability when item level is below unlock level", () => {
    const item = makeItem({
      level: 2,
      abilities: [{ ability: "haste", unlockLevel: 3 }],
    });
    const source: SourceForItem = {
      requirements: [abilityAvailableReq("haste")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual([]);
  });

  it("returns only the subset matching requirements (intersection)", () => {
    const item = makeItem({ abilities: ["haste", "sprint"] });
    const source: SourceForItem = {
      requirements: [abilityAvailableReq("haste")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual(["haste"]);
  });

  it("returns [] when abilities is undefined", () => {
    const item = makeItem({ abilities: undefined });
    const source: SourceForItem = {
      requirements: [abilityAvailableReq("haste")],
    };
    expect(filterUsefulAbilities(item, source)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// filterUsefulKeywords
// ---------------------------------------------------------------------------

describe("filterUsefulKeywords", () => {
  it("returns [] when item has no keywords", () => {
    const item = makeItem({ keywords: [] });
    expect(filterUsefulKeywords(item, [keywordEquippedReq("axe")])).toEqual([]);
  });

  it("returns [] when no keyword-type requirements exist", () => {
    const item = makeItem({ keywords: ["axe"] });
    expect(filterUsefulKeywords(item, [abilityAvailableReq("haste")])).toEqual(
      [],
    );
  });

  it("returns a truthy value for a satisfied keywordEquipped requirement", () => {
    const item = makeItem({ keywords: ["axe"] });
    const result = filterUsefulKeywords(item, [keywordEquippedReq("axe")]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeTruthy();
  });

  it("returns nothing for a non-matching keywordEquipped requirement", () => {
    const item = makeItem({ keywords: ["hammer"] });
    const result = filterUsefulKeywords(item, [keywordEquippedReq("axe")]);
    expect(result).toHaveLength(0);
  });

  it("matches distinctKeywordItemsEquipped when item has any listed keyword", () => {
    const item = makeItem({ keywords: ["axe"] });
    const req = distinctKeywordReq(["axe", "tool"], 1);
    const result = filterUsefulKeywords(item, [req]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeTruthy();
  });

  it("returns [] when keywords is undefined", () => {
    const item = makeItem({ keywords: undefined });
    expect(filterUsefulKeywords(item, [keywordEquippedReq("axe")])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// filterUsefulAttrs
// ---------------------------------------------------------------------------

describe("filterUsefulAttrs", () => {
  describe("activity-only vs recipe-only filtering", () => {
    it("removes activity-only attrs when isRecipe is true", () => {
      const attrs = [
        makeAttr("Fine material finding"),
        makeAttr("Find gems"),
        makeAttr("Find bird nests"),
        makeAttr("Find collectibles"),
        makeAttr("Work efficiency"),
      ];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ isRecipe: true }),
      );
      expect(result.map((a) => a.statText)).toContain("Work efficiency");
      expect(result.map((a) => a.statText)).not.toContain(
        "Fine material finding",
      );
      expect(result.map((a) => a.statText)).not.toContain("Find gems");
      expect(result.map((a) => a.statText)).not.toContain("Find bird nests");
    });

    it("removes recipe-only attrs when isRecipe is false", () => {
      const attrs = [
        makeAttr("No materials consumed"),
        makeAttr("Quality outcome"),
        makeAttr("Work efficiency"),
      ];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ isRecipe: false }),
      );
      expect(result.map((a) => a.statText)).toContain("Work efficiency");
      expect(result.map((a) => a.statText)).not.toContain(
        "No materials consumed",
      );
      expect(result.map((a) => a.statText)).not.toContain("Quality outcome");
    });
  });

  describe("Quality outcome special case", () => {
    it("keeps Quality outcome when isRecipe and craftedRewardItemIds is non-empty", () => {
      const attrs = [makeAttr("Quality outcome")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({
          isRecipe: true,
          craftedRewardItemIds: ["item_01"],
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("removes Quality outcome when isRecipe but craftedRewardItemIds is empty", () => {
      const attrs = [makeAttr("Quality outcome")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ isRecipe: true, craftedRewardItemIds: [] }),
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("context-based filtering", () => {
    it("removes Find collectibles when hasCollectibleDrops is false", () => {
      const attrs = [makeAttr("Find collectibles")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ hasCollectibleDrops: false }),
      );
      expect(result).toHaveLength(0);
    });

    it("keeps Find collectibles when hasCollectibleDrops is true", () => {
      const attrs = [makeAttr("Find collectibles")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ hasCollectibleDrops: true }),
      );
      expect(result).toHaveLength(1);
    });

    it("removes Fine material finding when hasFineDrops is false", () => {
      const attrs = [makeAttr("Fine material finding")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ hasFineDrops: false }),
      );
      expect(result).toHaveLength(0);
    });

    it("removes Inventory space when hideInventoryAttr is true", () => {
      const attrs = [makeAttr("Inventory space")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ hideInventoryAttr: true }),
      );
      expect(result).toHaveLength(0);
    });

    it("keeps Inventory space when hideInventoryAttr is false", () => {
      const attrs = [makeAttr("Inventory space")];
      const result = filterUsefulAttrs(
        attrs,
        makeActivityOptions({ hideInventoryAttr: false }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("requirement checking", () => {
    it("removes attrs when checkRequirements returns false", () => {
      const req = keywordEquippedReq("axe");
      const attr = makeAttr("Work efficiency", [], { requirements: [req] });
      const result = filterUsefulAttrs(
        [attr],
        makeActivityOptions({ checkRequirements: () => false }),
      );
      expect(result).toHaveLength(0);
    });

    it("does not pass distinctKeywordItemsEquipped to checkRequirements", () => {
      const req = distinctKeywordReq(["axe"], 1);
      const attr = makeAttr("Work efficiency", [], { requirements: [req] });
      const seen: Requirement[][] = [];
      filterUsefulAttrs(
        [attr],
        makeActivityOptions({
          checkRequirements: (reqs) => {
            seen.push(reqs);
            return true;
          },
        }),
      );
      expect(seen[0]).toHaveLength(0);
    });
  });

  describe("stat positivity filtering", () => {
    it("removes attrs with all-negative stats", () => {
      const attr = makeAttr("Work efficiency", [{ isNegative: true }]);
      const result = filterUsefulAttrs([attr], makeActivityOptions());
      expect(result).toHaveLength(0);
    });

    it("keeps attrs with at least one non-negative stat", () => {
      const attr = makeAttr("Work efficiency", [{ isNegative: false }]);
      const result = filterUsefulAttrs([attr], makeActivityOptions());
      expect(result).toHaveLength(1);
    });
  });
});
