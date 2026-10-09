import { describe, it, expect } from "vitest";
import {
  materialValue,
  computeGoldTotal,
  computeTokenTotal,
  buildGoldBreakdown,
  buildTokenBreakdown,
  computeRecipeValue,
} from "@/domain/drops/aggregateDropValue";
import type {
  MaterialValueInfo,
  MaterialValueSource,
  GearItemRef,
  BreakdownLine,
} from "@/domain/drops/aggregateDropValue";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { ItemValueMap } from "@/domain/types/item";
import type { TokenValuesMap } from "@/domain/constants/tokenValues";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDropInfo(
  id: string,
  overrides: Partial<DropItemInfo> = {},
): DropItemInfo {
  return {
    id,
    icon: `icons/${id}.png`,
    sources: [],
    totalDropChance: 50,
    stepsPerItem: 1000,
    itemsPerStep: 1,
    stepsPerNormal: 1000,
    stepsPerFine: 0,
    stepsPerRare: 0,
    dropCounts: "1",
    variableRequirement: null,
    ...overrides,
  };
}

function makeValueInfo(
  stepsPerNormal: number,
  stepsPerFine = 0,
): MaterialValueInfo {
  return { stepsPerNormal, stepsPerFine };
}

// ---------------------------------------------------------------------------
// materialValue
// ---------------------------------------------------------------------------

describe("materialValue", () => {
  it("returns (1000/stepsPerNormal) * common when stepsPerFine is 0 and id is in valueSource", () => {
    const info = makeValueInfo(500, 0);
    const result = materialValue("fish", info, { fish: { common: 4 } });
    expect(result).toBeCloseTo(8); // (1000/500)*4 = 8
  });

  it("returns undefined when stepsPerFine is 0 and id is NOT in valueSource", () => {
    const info = makeValueInfo(500, 0);
    expect(materialValue("fish", info, {})).toBeUndefined();
  });

  it("includes fine component when stepsPerFine > 0", () => {
    const info = makeValueInfo(1000, 2000);
    const result = materialValue("ore", info, { ore: { common: 10, fine: 50 } });
    // (1000/1000)*10 + (1000/2000)*50 = 10 + 25 = 35
    expect(result).toBeCloseTo(35);
  });

  it("treats missing fine value as 0 when stepsPerFine > 0", () => {
    const info = makeValueInfo(1000, 2000);
    const result = materialValue("ore", info, { ore: { common: 10 } });
    // (1000/1000)*10 + (1000/2000)*0 = 10
    expect(result).toBeCloseTo(10);
  });

  it("returns 0 normal contribution when stepsPerNormal is 0", () => {
    const info = makeValueInfo(0, 2000);
    const result = materialValue("ore", info, { ore: { common: 10, fine: 50 } });
    // 0*10 + (1000/2000)*50 = 25
    expect(result).toBeCloseTo(25);
  });
});

// ---------------------------------------------------------------------------
// computeGoldTotal
// ---------------------------------------------------------------------------

describe("computeGoldTotal", () => {
  it("adds itemsPerStep directly for the gold item", () => {
    const dropMap = { gold: makeDropInfo("gold", { itemsPerStep: 5 }) };
    const result = computeGoldTotal(dropMap, {}, {} as ItemValueMap);
    expect(result).toBeCloseTo(5);
  });

  it("uses quality-based price for gear items present in both registries", () => {
    const gearItem: GearItemRef = { type: "tool", quality: "common" };
    const dropMap = {
      axe_01: makeDropInfo("axe_01", { itemsPerStep: 2, stepsPerNormal: 500, stepsPerFine: 0 }),
    };
    const itemValues = {
      axe_01: { common: 10, uncommon: 20, rare: 40, epic: 80, legendary: 160, ethereal: 320 },
    };
    const result = computeGoldTotal(
      dropMap,
      { axe_01: gearItem },
      itemValues as ItemValueMap,
    );
    expect(result).toBeCloseTo(20); // 2 * 10
  });

  it("uses materialValue for non-gear items in itemValues", () => {
    const dropMap = {
      fish_01: makeDropInfo("fish_01", {
        stepsPerNormal: 500,
        stepsPerFine: 0,
      }),
    };
    const itemValues = {
      fish_01: { common: 4 } as unknown as ItemValueMap[string],
    };
    const result = computeGoldTotal(
      dropMap,
      {},
      itemValues as unknown as ItemValueMap,
    );
    expect(result).toBeCloseTo(8); // (1000/500)*4
  });

  it("skips items not in itemValues", () => {
    const dropMap = { unknown: makeDropInfo("unknown") };
    expect(computeGoldTotal(dropMap, {}, {} as ItemValueMap)).toBe(0);
  });

  it("sums multiple drop sources", () => {
    const dropMap = {
      gold: makeDropInfo("gold", { itemsPerStep: 3 }),
      fish_01: makeDropInfo("fish_01", { stepsPerNormal: 1000, stepsPerFine: 0 }),
    };
    const itemValues = {
      fish_01: { common: 2 } as unknown as ItemValueMap[string],
    };
    const result = computeGoldTotal(
      dropMap,
      {},
      itemValues as unknown as ItemValueMap,
    );
    expect(result).toBeCloseTo(5); // 3 (gold) + 2 (fish)
  });
});

// ---------------------------------------------------------------------------
// computeTokenTotal
// ---------------------------------------------------------------------------

describe("computeTokenTotal", () => {
  it("returns 0 when no items are in the token values map", () => {
    const dropMap = { fish_01: makeDropInfo("fish_01") };
    const tokenValues: TokenValuesMap = {};
    expect(computeTokenTotal(dropMap, tokenValues)).toBe(0);
  });

  it("sums materialValue contributions for token items", () => {
    const dropMap = {
      token: makeDropInfo("token", { stepsPerNormal: 500, stepsPerFine: 0 }),
    };
    const tokenValues: TokenValuesMap = { token: { common: 1 } };
    const result = computeTokenTotal(dropMap, tokenValues);
    expect(result).toBeCloseTo(2); // (1000/500)*1
  });

  it("skips items not in tokenValues", () => {
    const dropMap = {
      fish: makeDropInfo("fish", { stepsPerNormal: 500, stepsPerFine: 0 }),
      token: makeDropInfo("token", { stepsPerNormal: 500, stepsPerFine: 0 }),
    };
    const tokenValues: TokenValuesMap = { token: { common: 1 } };
    const result = computeTokenTotal(dropMap, tokenValues);
    expect(result).toBeCloseTo(2); // only token counts
  });
});

// ---------------------------------------------------------------------------
// buildGoldBreakdown
// ---------------------------------------------------------------------------

describe("buildGoldBreakdown", () => {
  it("returns a Gold line for the gold drop", () => {
    const dropMap = { gold: makeDropInfo("gold", { itemsPerStep: 5 }) };
    const lines = buildGoldBreakdown(dropMap, {}, {}, {} as ItemValueMap);
    expect(lines.some((l: BreakdownLine) => l.label === "Gold")).toBe(true);
  });

  it("returns no Gold line when there is no gold item", () => {
    const dropMap = {};
    const lines = buildGoldBreakdown(dropMap, {}, {}, {} as ItemValueMap);
    expect(lines.some((l: BreakdownLine) => l.label === "Gold")).toBe(false);
  });

  it("returns a Drops line for material items with value", () => {
    const dropMap = {
      fish_01: makeDropInfo("fish_01", { stepsPerNormal: 500, stepsPerFine: 0 }),
    };
    const itemValues = {
      fish_01: { common: 4 } as unknown as ItemValueMap[string],
    };
    const allMaterialItems = { fish_01: {} } as never;
    const lines = buildGoldBreakdown(
      dropMap,
      {},
      allMaterialItems,
      itemValues as unknown as ItemValueMap,
    );
    expect(lines.some((l: BreakdownLine) => l.label === "Drops")).toBe(true);
  });

  it("total value across lines matches computeGoldTotal", () => {
    const dropMap = {
      gold: makeDropInfo("gold", { itemsPerStep: 3 }),
    };
    const lines = buildGoldBreakdown(dropMap, {}, {}, {} as ItemValueMap);
    const lineTotal = lines
      .filter((l: BreakdownLine) => l.value > 0)
      .reduce((s: number, l: BreakdownLine) => s + l.value, 0);
    expect(lineTotal).toBeCloseTo(3);
  });
});

// ---------------------------------------------------------------------------
// buildTokenBreakdown
// ---------------------------------------------------------------------------

describe("buildTokenBreakdown", () => {
  it("returns empty array when no items are in tokenValuesMap", () => {
    const dropMap = { fish: makeDropInfo("fish") };
    expect(buildTokenBreakdown(dropMap, {})).toEqual([]);
  });

  it("returns one line per matching token item", () => {
    const dropMap = {
      token_a: makeDropInfo("token_a", { stepsPerNormal: 500, stepsPerFine: 0 }),
      token_b: makeDropInfo("token_b", { stepsPerNormal: 1000, stepsPerFine: 0 }),
    };
    const tokenValues: TokenValuesMap = {
      token_a: { common: 1 },
      token_b: { common: 2 },
    };
    const lines = buildTokenBreakdown(dropMap, tokenValues);
    expect(lines).toHaveLength(2);
  });

  it("line values match materialValue calculations", () => {
    const dropMap = {
      token: makeDropInfo("token", { stepsPerNormal: 500, stepsPerFine: 0, icon: "icons/t.png" }),
    };
    const tokenValues: TokenValuesMap = { token: { common: 1 } };
    const lines = buildTokenBreakdown(dropMap, tokenValues);
    expect(lines[0].value).toBeCloseTo(2); // (1000/500)*1
    expect(lines[0].icon).toBe("icons/t.png");
    expect(lines[0].label).toBe("token");
  });
});

describe("computeRecipeValue", () => {
  const params = (noMaterialsConsumed: number) => ({
    materials: [{ options: [{ item: "ore", amount: 2 }] }],
    itemRewards: { bar: 1 },
    stepsPerRewardRoll: 10,
    stepsPerAction: 10,
    noMaterialsConsumed,
    useFine: false,
    allGearItems: {},
    itemValues: {
      ore: { common: 5, fine: 20 },
      bar: { common: 30, fine: 90 },
    } as unknown as ItemValueMap,
    craftingOdds: [],
  });

  it("is reward value minus material cost per 1k steps", () => {
    // 100 crafts per 1k steps: 100 × 30 reward − 100 × 2 × 5 cost.
    expect(computeRecipeValue(params(0) as never)).toBeCloseTo(3000 - 1000, 6);
  });

  it("gets cheaper with no materials consumed", () => {
    // Half the actions consume nothing: cost halves.
    expect(computeRecipeValue(params(0.5) as never)).toBeCloseTo(3000 - 500, 6);
  });
});
