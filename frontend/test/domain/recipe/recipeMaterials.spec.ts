import { describe, it, expect } from "vitest";
import {
  extractLevelRequirement,
  resolveMaterials,
} from "@/domain/recipe/recipeMaterials";
import type {
  RecipeMaterialLookups,
  ItemRef,
} from "@/domain/recipe/recipeMaterials";
import type { Requirement } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSkillLevelReq(skill: string, level: number): Requirement {
  return {
    type: "skillLevel",
    requirement: { skill, level },
    name: null,
    opposite: false,
  } as Requirement;
}

function makeOtherReq(): Requirement {
  return {
    type: "mainSkill",
    requirement: { skill: "woodcutting" },
    name: null,
    opposite: false,
  } as Requirement;
}

function makeLookups(
  items: Record<string, ItemRef> = {},
): RecipeMaterialLookups {
  return { getItem: (id) => items[id] };
}

const itemA: ItemRef = { name: "Oak Log", icon: "icons/oak.png" };
const itemB: ItemRef = { name: "Pine Log", icon: "icons/pine.png" };

// ---------------------------------------------------------------------------
// extractLevelRequirement
// ---------------------------------------------------------------------------

describe("extractLevelRequirement", () => {
  it("returns default when requirements array is empty", () => {
    expect(extractLevelRequirement([])).toEqual({ level: 1, skill: "none" });
  });

  it("returns default when no skillLevel requirement is present", () => {
    expect(extractLevelRequirement([makeOtherReq()])).toEqual({
      level: 1,
      skill: "none",
    });
  });

  it("returns the skill and level from a skillLevel requirement", () => {
    const req = makeSkillLevelReq("woodcutting", 25);
    expect(extractLevelRequirement([req])).toEqual({
      level: 25,
      skill: "woodcutting",
    });
  });

  it("returns the first skillLevel requirement when multiple are present", () => {
    const req1 = makeSkillLevelReq("woodcutting", 25);
    const req2 = makeSkillLevelReq("agility", 10);
    expect(extractLevelRequirement([req1, req2])).toEqual({
      level: 25,
      skill: "woodcutting",
    });
  });

  it("finds the skillLevel requirement even when other types precede it", () => {
    const req = makeSkillLevelReq("fishing", 30);
    expect(extractLevelRequirement([makeOtherReq(), req])).toEqual({
      level: 30,
      skill: "fishing",
    });
  });
});

// ---------------------------------------------------------------------------
// resolveMaterials — empty / no-op cases
// ---------------------------------------------------------------------------

describe("resolveMaterials — edge cases", () => {
  it("returns [] when materials array is empty", () => {
    expect(resolveMaterials([], makeLookups())).toEqual([]);
  });

  it("skips options whose item is not in the lookup", () => {
    const materials = [{ options: [{ item: "unknown_item", amount: 1 }] }];
    expect(resolveMaterials(materials, makeLookups())).toEqual([[]]); // one group, zero options
  });

  it("returns an empty inner array for a group with all unknown items", () => {
    const materials = [
      {
        options: [
          { item: "unknown_a", amount: 1 },
          { item: "unknown_b", amount: 2 },
        ],
      },
    ];
    const [group] = resolveMaterials(materials, makeLookups());
    expect(group).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// resolveMaterials — resolution
// ---------------------------------------------------------------------------

describe("resolveMaterials — resolution", () => {
  it("resolves name, icon, id, and amount for a known item", () => {
    const materials = [{ options: [{ item: "oak_log", amount: 3 }] }];
    const [[opt]] = resolveMaterials(
      materials,
      makeLookups({ oak_log: itemA }),
    );
    expect(opt).toEqual({
      id: "oak_log",
      name: "Oak Log",
      icon: "icons/oak.png",
      amount: 3,
    });
  });

  it("preserves the amount from the raw option", () => {
    const materials = [{ options: [{ item: "oak_log", amount: 7 }] }];
    const [[opt]] = resolveMaterials(
      materials,
      makeLookups({ oak_log: itemA }),
    );
    expect(opt.amount).toBe(7);
  });

  it("resolves multiple options within one group", () => {
    const materials = [
      {
        options: [
          { item: "oak_log", amount: 1 },
          { item: "pine_log", amount: 2 },
        ],
      },
    ];
    const [group] = resolveMaterials(
      materials,
      makeLookups({ oak_log: itemA, pine_log: itemB }),
    );
    expect(group).toHaveLength(2);
    expect(group[0].name).toBe("Oak Log");
    expect(group[1].name).toBe("Pine Log");
  });

  it("keeps known options and skips unknown ones in the same group", () => {
    const materials = [
      {
        options: [
          { item: "oak_log", amount: 1 },
          { item: "missing", amount: 5 },
        ],
      },
    ];
    const [group] = resolveMaterials(
      materials,
      makeLookups({ oak_log: itemA }),
    );
    expect(group).toHaveLength(1);
    expect(group[0].id).toBe("oak_log");
  });

  it("returns one outer array entry per material slot", () => {
    const materials = [
      { options: [{ item: "oak_log", amount: 1 }] },
      { options: [{ item: "pine_log", amount: 2 }] },
    ];
    const result = resolveMaterials(
      materials,
      makeLookups({ oak_log: itemA, pine_log: itemB }),
    );
    expect(result).toHaveLength(2);
  });
});
