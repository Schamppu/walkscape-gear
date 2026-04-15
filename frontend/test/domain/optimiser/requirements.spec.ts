import { describe, it, expect } from "vitest";
import {
  getReq,
  contributesToReq,
  filterItemsForReq,
  getRequirementCandidates,
} from "@/domain/optimiser/requirements";
import { makeOptimiserItem } from "../../fixtures/optimiser";
import type {
  KeywordEquippedRequirement,
  DistinctKeywordItemsEquippedRequirement,
  KeywordWithLevelEquippedRequirement,
  AbilityAvailableRequirement,
} from "@/domain/types/requirement";
import type { OptimiserItem } from "@/domain/optimiser/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function keywordEquipped(keyword: string): KeywordEquippedRequirement {
  return {
    type: "keywordEquipped",
    name: null,
    opposite: false,
    requirement: { keyword },
  };
}

function distinctKeywordItems(
  keywords: string[],
  quantity: number,
): DistinctKeywordItemsEquippedRequirement {
  return {
    type: "distinctKeywordItemsEquipped",
    name: null,
    opposite: false,
    requirement: { keywords, quantity },
  };
}

function keywordWithLevel(
  keyword: string,
  level: number,
): KeywordWithLevelEquippedRequirement {
  return {
    type: "keywordWithLevelEquipped",
    name: null,
    opposite: false,
    requirement: { keyword, skill: "fishing", level },
  };
}

function abilityAvailable(ability: string): AbilityAvailableRequirement {
  return {
    type: "abilityAvailable",
    name: null,
    opposite: false,
    requirement: { ability, scanEquippedItems: false },
  };
}

// ---------------------------------------------------------------------------
// getReq
// ---------------------------------------------------------------------------

describe("getReq", () => {
  it("keywordEquipped → keyword, quantity=1, level=1", () => {
    const req = getReq(keywordEquipped("axe"));
    expect(req).toEqual({ keyword: "axe", quantity: 1, level: 1 });
  });

  it("distinctKeywordItemsEquipped → first keyword, specified quantity, level=1", () => {
    const req = getReq(distinctKeywordItems(["tool", "metal"], 3));
    expect(req).toEqual({ keyword: "tool", quantity: 3, level: 1 });
  });

  it("keywordWithLevelEquipped → keyword, quantity=1, specified level", () => {
    const req = getReq(keywordWithLevel("fishing_rod", 30));
    expect(req).toEqual({ keyword: "fishing_rod", quantity: 1, level: 30 });
  });

  it("abilityAvailable → ability, quantity=1, level=1", () => {
    const req = getReq(abilityAvailable("haste"));
    expect(req).toEqual({ ability: "haste", quantity: 1, level: 1 });
  });
});

// ---------------------------------------------------------------------------
// contributesToReq
// ---------------------------------------------------------------------------

describe("contributesToReq", () => {
  describe("keyword requirements", () => {
    it("returns 1 when item has the required keyword", () => {
      const item = makeOptimiserItem("a", [], {
        keywords: ["axe"],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { keyword: "axe", quantity: 1, level: 1 }),
      ).toBe(1);
    });

    it("returns 0 when item lacks the required keyword", () => {
      const item = makeOptimiserItem("a", [], {
        keywords: ["hammer"],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { keyword: "axe", quantity: 1, level: 1 }),
      ).toBe(0);
    });

    it("returns 0 when item has no keywords", () => {
      const item = makeOptimiserItem("a", [], {
        keywords: [],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { keyword: "axe", quantity: 1, level: 1 }),
      ).toBe(0);
    });

    it("returns 0 when item level is below the required level", () => {
      const item = makeOptimiserItem("a", [], {
        keywords: ["fishing_rod"],
        level: 10,
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, {
          keyword: "fishing_rod",
          quantity: 1,
          level: 30,
        }),
      ).toBe(0);
    });

    it("returns 1 when item level meets the required level", () => {
      const item = makeOptimiserItem("a", [], {
        keywords: ["fishing_rod"],
        level: 30,
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, {
          keyword: "fishing_rod",
          quantity: 1,
          level: 30,
        }),
      ).toBe(1);
    });
  });

  describe("ability requirements", () => {
    it("returns 1 when item has the ability as a plain string", () => {
      const item = makeOptimiserItem("a", [], {
        abilities: ["haste"],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { ability: "haste", quantity: 1, level: 1 }),
      ).toBe(1);
    });

    it("returns 0 when item lacks the required ability", () => {
      const item = makeOptimiserItem("a", [], {
        abilities: ["sprint"],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { ability: "haste", quantity: 1, level: 1 }),
      ).toBe(0);
    });

    it("returns 1 when item has the ability as an object with met level threshold", () => {
      const item = makeOptimiserItem("a", [], {
        level: 3,
        abilities: [{ ability: "haste", unlockLevel: 1 }],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { ability: "haste", quantity: 1, level: 1 }),
      ).toBe(1);
    });

    it("returns 0 when item has the ability but level is below the unlock level", () => {
      const item = makeOptimiserItem("a", [], {
        level: 1,
        abilities: [{ ability: "haste", unlockLevel: 3 }],
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { ability: "haste", quantity: 1, level: 1 }),
      ).toBe(0);
    });

    it("returns 0 when item has no abilities", () => {
      const item = makeOptimiserItem("a", [], {
        abilities: undefined,
      } as Partial<OptimiserItem>);
      expect(
        contributesToReq(item, { ability: "haste", quantity: 1, level: 1 }),
      ).toBe(0);
    });
  });

  it("returns 0 for null item", () => {
    expect(
      contributesToReq(null, { keyword: "axe", quantity: 1, level: 1 }),
    ).toBe(0);
  });

  it("returns 0 for undefined item", () => {
    expect(
      contributesToReq(undefined, { keyword: "axe", quantity: 1, level: 1 }),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRequirementCandidates — slot expansion and scoring
// ---------------------------------------------------------------------------

describe("getRequirementCandidates", () => {
  it("returns candidates for items that match the requirement", () => {
    const item = makeOptimiserItem("rod", [], {
      keywords: ["fishing_rod"],
    } as Partial<OptimiserItem>);
    const gearOptions = { tool: [item] };
    const req = { keyword: "fishing_rod", quantity: 1, level: 1 };
    const candidates = getRequirementCandidates(
      gearOptions,
      req,
      "stepsPerRewardRoll",
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.every((c) => c.item.keywords?.includes("fishing_rod")),
    ).toBe(true);
  });

  it("expands ring slot to 2 candidates (one per ring slot)", () => {
    const item = makeOptimiserItem("ring", [], {
      keywords: ["ring_kw"],
    } as Partial<OptimiserItem>);
    const gearOptions = { ring: [item] };
    const req = { keyword: "ring_kw", quantity: 1, level: 1 };
    const candidates = getRequirementCandidates(
      gearOptions,
      req,
      "stepsPerRewardRoll",
    );
    expect(candidates.length).toBe(2);
    expect(candidates.map((c) => c.slotName)).toEqual(["ring1", "ring2"]);
  });

  it("returns no candidates when no items match the requirement", () => {
    const item = makeOptimiserItem("hammer", [], {
      keywords: ["hammer"],
    } as Partial<OptimiserItem>);
    const gearOptions = { primary: [item] };
    const req = { keyword: "axe", quantity: 1, level: 1 };
    const candidates = getRequirementCandidates(
      gearOptions,
      req,
      "stepsPerRewardRoll",
    );
    expect(candidates).toHaveLength(0);
  });

  it("sorts candidates with higher score first for LOW_STAT priorities", () => {
    // compareScore for LOW_STAT sorts descending by score value (higher score = worse, but placed first)
    const low = makeOptimiserItem("low", [], {
      score: 100,
      keywords: ["tool"],
    } as Partial<OptimiserItem>);
    const high = makeOptimiserItem("high", [], {
      score: 200,
      keywords: ["tool"],
    } as Partial<OptimiserItem>);
    const gearOptions = { head: [low, high] };
    const req = { keyword: "tool", quantity: 1, level: 1 };
    const candidates = getRequirementCandidates(
      gearOptions,
      req,
      "stepsPerRewardRoll",
    );
    expect(candidates[0].item.id).toBe("high");
  });

  it("sorts candidates by score: higher score first for HIGH_STAT priorities", () => {
    const low = makeOptimiserItem("low", [], {
      score: 100,
      keywords: ["tool"],
    } as Partial<OptimiserItem>);
    const high = makeOptimiserItem("high", [], {
      score: 200,
      keywords: ["tool"],
    } as Partial<OptimiserItem>);
    const gearOptions = { head: [low, high] };
    const req = { keyword: "tool", quantity: 1, level: 1 };
    const candidates = getRequirementCandidates(gearOptions, req, "xpPerStep");
    expect(candidates[0].item.id).toBe("high");
  });
});
