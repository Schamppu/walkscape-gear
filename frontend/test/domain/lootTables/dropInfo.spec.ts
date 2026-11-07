import { describe, it, expect } from "vitest";
import {
  resolveDropMultiplier,
  getVariableRequirement,
} from "@/domain/lootTables/dropInfo";
import type { FindModifiers } from "@/domain/lootTables/dropInfo";
import type { MappedTableRow } from "@/domain/types/lootTable";
import { makeLootTableRow } from "../../fixtures/lootTables";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModifiers(overrides: Partial<FindModifiers> = {}): FindModifiers {
  return {
    chestFind: 1,
    findCollectibles: 1,
    findGems: 1,
    findBirdNests: 1,
    ...overrides,
  };
}

function makeMappedRow(
  overrides: Partial<MappedTableRow> = {},
): MappedTableRow {
  return {
    ...makeLootTableRow(),
    noDropChance: 0,
    tableWeight: 100,
    rollAmount: 1,
    type: ["normal"],
    tableSource: "activity-fishing",
    rollChance: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveDropMultiplier
// ---------------------------------------------------------------------------

describe("resolveDropMultiplier", () => {
  it("returns 1 for an empty types array", () => {
    expect(resolveDropMultiplier([], makeModifiers())).toBe(1);
  });

  it("applies chestFind for 'chestTable' type", () => {
    const mods = makeModifiers({ chestFind: 2.5 });
    expect(resolveDropMultiplier(["chestTable"], mods)).toBe(2.5);
  });

  it("applies findCollectibles for 'collectible' type", () => {
    const mods = makeModifiers({ findCollectibles: 3 });
    expect(resolveDropMultiplier(["collectible"], mods)).toBe(3);
  });

  it("applies findGems for 'gem' type", () => {
    const mods = makeModifiers({ findGems: 1.5 });
    expect(resolveDropMultiplier(["gem"], mods)).toBe(1.5);
  });

  it("applies findBirdNests for 'birdNest' type", () => {
    const mods = makeModifiers({ findBirdNests: 2 });
    expect(resolveDropMultiplier(["birdNest"], mods)).toBe(2);
  });

  it("multiplies all matching modifiers together", () => {
    const mods = makeModifiers({
      chestFind: 2,
      findCollectibles: 3,
      findGems: 1.5,
      findBirdNests: 2,
    });
    const types = ["chestTable", "collectible", "gem", "birdNest"];
    expect(resolveDropMultiplier(types, mods)).toBeCloseTo(2 * 3 * 1.5 * 2);
  });

  it("ignores unrelated type strings", () => {
    expect(
      resolveDropMultiplier(
        ["normal", "rare"],
        makeModifiers({ chestFind: 5 }),
      ),
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getVariableRequirement
// ---------------------------------------------------------------------------

describe("getVariableRequirement", () => {
  it("returns null when item has no requirementsBonuses", () => {
    const row = makeMappedRow({ requirementsBonuses: undefined });
    expect(getVariableRequirement(row, {})).toBeNull();
  });

  it("returns null when requirementsBonuses is an empty array", () => {
    const row = makeMappedRow({ requirementsBonuses: [] });
    expect(getVariableRequirement(row, {})).toBeNull();
  });

  it("returns the levelRequirement from the first bonus element", () => {
    const row = makeMappedRow({
      requirementsBonuses: [
        { levelRequirement: 30, levelMaxScaling: 50, relatedSkill: "fishing" },
      ],
    });
    const result = getVariableRequirement(row, {});
    expect(result?.levelRequirement).toBe(30);
  });

  it("looks up the icon from skillsMap using relatedSkill", () => {
    const row = makeMappedRow({
      requirementsBonuses: [
        { levelRequirement: 10, levelMaxScaling: 50, relatedSkill: "mining" },
      ],
    });
    const result = getVariableRequirement(row, {
      mining: { icon: "icons/mining.png" },
    });
    expect(result?.icon).toBe("icons/mining.png");
  });

  it("defaults icon to empty string when skill is not in skillsMap", () => {
    const row = makeMappedRow({
      requirementsBonuses: [
        {
          levelRequirement: 20,
          levelMaxScaling: 50,
          relatedSkill: "unknown_skill",
        },
      ],
    });
    const result = getVariableRequirement(row, {});
    expect(result?.icon).toBe("");
  });
});
