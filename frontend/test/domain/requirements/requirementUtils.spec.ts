import { describe, it, expect } from "vitest";
import {
  getLevelRequirementsMap,
  mergeRequirements,
} from "@/domain/requirements/requirementUtils";
import type {
  SkillLevelRequirement,
  DistinctKeywordItemsEquippedRequirement,
  AbilityAvailableRequirement,
} from "@/domain/types/requirement";
import type { Requirement } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function skillLevel(
  skill: string,
  level: number,
  opposite = false,
): SkillLevelRequirement {
  return { type: "skillLevel", name: null, opposite, requirement: { skill, level } };
}

function keywordItems(
  keywords: string[],
  quantity: number,
  opposite = false,
): DistinctKeywordItemsEquippedRequirement {
  return {
    type: "distinctKeywordItemsEquipped",
    name: null,
    opposite,
    requirement: { keywords, quantity },
  };
}

function abilityAvailable(
  ability: string,
  opposite = false,
): AbilityAvailableRequirement {
  return {
    type: "abilityAvailable",
    name: null,
    opposite,
    requirement: { ability, scanEquippedItems: false },
  };
}

// ---------------------------------------------------------------------------
// getLevelRequirementsMap
// ---------------------------------------------------------------------------

describe("getLevelRequirementsMap", () => {
  it("returns empty object for null input", () => {
    expect(getLevelRequirementsMap(null)).toEqual({});
  });

  it("returns empty object for undefined input", () => {
    expect(getLevelRequirementsMap(undefined)).toEqual({});
  });

  it("returns empty object for empty array", () => {
    expect(getLevelRequirementsMap([])).toEqual({});
  });

  it("extracts a single skillLevel requirement", () => {
    const result = getLevelRequirementsMap([skillLevel("fishing", 20)]);
    expect(result).toEqual({ fishing: 20 });
  });

  it("extracts multiple skillLevel requirements for different skills", () => {
    const result = getLevelRequirementsMap([
      skillLevel("fishing", 20),
      skillLevel("mining", 35),
    ]);
    expect(result).toEqual({ fishing: 20, mining: 35 });
  });

  it("ignores non-skillLevel requirement types", () => {
    const requirements: Requirement[] = [
      skillLevel("agility", 10),
      abilityAvailable("some_ability"),
      keywordItems(["tool"], 2),
    ];
    expect(getLevelRequirementsMap(requirements)).toEqual({ agility: 10 });
  });

  it("Highest level wins for duplicate skills", () => {
    const result = getLevelRequirementsMap([
      skillLevel("fishing", 30),
      skillLevel("fishing", 10),
    ]);
    expect(result).toEqual({ fishing: 30 });
  });
});

// ---------------------------------------------------------------------------
// mergeRequirements — skillLevel strategy
// ---------------------------------------------------------------------------

describe("mergeRequirements — skillLevel", () => {
  it("keeps a single requirement unchanged", () => {
    const reqs = [skillLevel("fishing", 20)];
    expect(mergeRequirements(reqs)).toEqual(reqs);
  });

  it("deduplicates same skill keeping highest level", () => {
    const result = mergeRequirements([
      skillLevel("fishing", 10),
      skillLevel("fishing", 25),
    ]);
    expect(result).toHaveLength(1);
    expect((result[0] as SkillLevelRequirement).requirement.level).toBe(25);
  });

  it("keeps requirements for different skills separate", () => {
    const result = mergeRequirements([
      skillLevel("fishing", 10),
      skillLevel("mining", 20),
    ]);
    expect(result).toHaveLength(2);
  });

  it("does not merge requirements with opposite=true vs opposite=false", () => {
    const result = mergeRequirements([
      skillLevel("fishing", 10, false),
      skillLevel("fishing", 10, true),
    ]);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// mergeRequirements — abilityAvailable strategy
// ---------------------------------------------------------------------------

describe("mergeRequirements — abilityAvailable", () => {
  it("deduplicates identical ability requirements", () => {
    const result = mergeRequirements([
      abilityAvailable("haste"),
      abilityAvailable("haste"),
    ]);
    expect(result).toHaveLength(1);
    expect((result[0] as AbilityAvailableRequirement).requirement.ability).toBe(
      "haste",
    );
  });

  it("keeps different abilities separate", () => {
    const result = mergeRequirements([
      abilityAvailable("haste"),
      abilityAvailable("sprint"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("does not merge ability requirements with different opposite flags", () => {
    const result = mergeRequirements([
      abilityAvailable("haste", false),
      abilityAvailable("haste", true),
    ]);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// mergeRequirements — distinctKeywordItemsEquipped strategy
// ---------------------------------------------------------------------------

describe("mergeRequirements — distinctKeywordItemsEquipped", () => {
  it("deduplicates same keywords keeping highest quantity", () => {
    const result = mergeRequirements([
      keywordItems(["tool"], 1),
      keywordItems(["tool"], 3),
    ]);
    expect(result).toHaveLength(1);
    expect(
      (result[0] as DistinctKeywordItemsEquippedRequirement).requirement
        .quantity,
    ).toBe(3);
  });

  it("keeps requirements with different keyword lists separate", () => {
    const result = mergeRequirements([
      keywordItems(["tool"], 1),
      keywordItems(["weapon"], 1),
    ]);
    expect(result).toHaveLength(2);
  });

  it("does not merge when opposite flags differ", () => {
    const result = mergeRequirements([
      keywordItems(["tool"], 1, false),
      keywordItems(["tool"], 2, true),
    ]);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// mergeRequirements — unknown types passed through
// ---------------------------------------------------------------------------

describe("mergeRequirements — unknown types", () => {
  it("passes through requirement types that have no strategy", () => {
    const locationReq: Requirement = {
      type: "locationHasKeywords",
      name: null,
      opposite: false,
      requirement: { keywords: ["forest"] },
    };
    const result = mergeRequirements([locationReq, locationReq]);
    expect(result).toHaveLength(2);
  });
});
