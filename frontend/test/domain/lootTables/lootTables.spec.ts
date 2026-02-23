import { describe, it, expect } from "vitest";
import {
  resolveRowWeight,
  resolveLootTableWeights,
  mapTableToItems,
  groupSourcesByStat,
  getCombinedRollChance,
  computeRollChance,
  computeSourceDropChance,
  getTotalDropChance,
  getStepsPerItem,
  getDropCounts,
} from "@/domain/lootTables/lootTables";
import type {
  DetailedLootTable,
  DetailedContextLootTable,
  MappedTableRow,
} from "@/domain/types/lootTable";

import swimmingTables from "../../fixtures/loot_tables/swimming_intermediate.json";
import soupKitchenTables from "../../fixtures/loot_tables/soup_kitchen.json";
import zipPouchTables from "../../fixtures/loot_tables/treasure_hunter_zip_pouch.json";

// ---------------------------------------------------------------------------
// Typed fixture helpers
// ---------------------------------------------------------------------------

const swimming = swimmingTables as unknown as DetailedLootTable[];
const soupKitchen = soupKitchenTables as unknown as DetailedLootTable[];
const zipPouch = zipPouchTables as unknown as DetailedLootTable[];

/** Builds a minimal DetailedContextLootTable wrapping given detailed tables. */
function makeCtxTable(
  tables: DetailedLootTable[],
  overrides: Partial<Omit<DetailedContextLootTable, "tables">> = {},
): DetailedContextLootTable {
  return {
    isPrimary: true,
    type: ["normal"],
    rollAmount: 1,
    tableSource: "activity-test",
    rollChance: 1,
    ...overrides,
    tables,
  };
}

// ---------------------------------------------------------------------------
// resolveRowWeight
// ---------------------------------------------------------------------------

describe("resolveRowWeight", () => {
  const ROW_WEIGHT = 10;
  const MIN_WEIGHT_SCALE = 0.05;
  const LEVEL_REQ = 20;
  const LEVEL_MAX = 50;

  it("returns 0 when level is below levelRequirement", () => {
    expect(resolveRowWeight(ROW_WEIGHT, MIN_WEIGHT_SCALE, LEVEL_REQ, LEVEL_MAX, 1)).toBe(0);
    expect(resolveRowWeight(ROW_WEIGHT, MIN_WEIGHT_SCALE, LEVEL_REQ, LEVEL_MAX, 19)).toBe(0);
  });

  it("returns full rowWeight when level >= levelMaxScaling", () => {
    expect(resolveRowWeight(ROW_WEIGHT, MIN_WEIGHT_SCALE, LEVEL_REQ, LEVEL_MAX, 50)).toBe(10);
    expect(resolveRowWeight(ROW_WEIGHT, MIN_WEIGHT_SCALE, LEVEL_REQ, LEVEL_MAX, 99)).toBe(10);
  });

  it("applies minWeightScale when rowWeight per step < 1 and level === levelRequirement", () => {
    // rowWeight=1, steps=31+1=31, 1/31 < 1, level===levelRequirement
    const result = resolveRowWeight(1, 0.05, LEVEL_REQ, LEVEL_MAX, LEVEL_REQ);
    // Math.floor(1 * 0.05 * 10 + 0.5) / 10 = Math.floor(1.0) / 10 = 0.1
    expect(result).toBeCloseTo(0.1, 5);
  });

  it("scales linearly between levelRequirement and levelMaxScaling (else branch)", () => {
    // rowWeight=10, steps=31, increment=10/31, level=25
    // weight = (10/31) * (25 - 19) = 60/31 ≈ 1.935, rounded to 1 decimal → 1.9
    const result = resolveRowWeight(ROW_WEIGHT, MIN_WEIGHT_SCALE, LEVEL_REQ, LEVEL_MAX, 25);
    expect(result).toBeCloseTo(1.9, 1);
  });

  it("returns full weight one step before max scaling", () => {
    // level = levelMaxScaling - 1 should be < levelMaxScaling, uses else branch
    const result = resolveRowWeight(ROW_WEIGHT, MIN_WEIGHT_SCALE, LEVEL_REQ, LEVEL_MAX, 49);
    // increment = 10/31, weight = (10/31)*(49-19) = 300/31 ≈ 9.677, rounded → 9.7
    expect(result).toBeCloseTo(9.7, 1);
  });
});

// ---------------------------------------------------------------------------
// resolveLootTableWeights
// ---------------------------------------------------------------------------

describe("resolveLootTableWeights", () => {
  it("returns same weights when no requirementsBonuses are present", () => {
    const resolved = resolveLootTableWeights(swimming, () => 1);
    const original = swimming[0].tableRows;
    const result = resolved[0].tableRows;
    original.forEach((row, i) => {
      expect(result[i].rowWeight).toBe(row.rowWeight);
    });
  });

  it("preserves table count and structure", () => {
    const resolved = resolveLootTableWeights(soupKitchen, () => 50);
    expect(resolved).toHaveLength(soupKitchen.length);
    resolved.forEach((table, i) => {
      expect(table.tableRows).toHaveLength(soupKitchen[i].tableRows.length);
    });
  });

  it("scales row weight to 0 when skill level is below requirement", () => {
    const tableWithBonus: DetailedLootTable[] = [
      {
        noDropChance: 0,
        tableRows: [
          {
            rowItemID: "test_item",
            rowWeight: 10,
            minWeightScale: 0.05,
            rowMinimumAmount: 1,
            rowMaximumAmount: 1,
            requirementsBonuses: [
              { levelRequirement: 30, levelMaxScaling: 60, relatedSkill: "fishing" },
            ],
          },
        ],
      },
    ];
    const resolved = resolveLootTableWeights(tableWithBonus, () => 10);
    expect(resolved[0].tableRows[0].rowWeight).toBe(0);
  });

  it("returns full row weight when skill level meets levelMaxScaling", () => {
    const tableWithBonus: DetailedLootTable[] = [
      {
        noDropChance: 0,
        tableRows: [
          {
            rowItemID: "test_item",
            rowWeight: 10,
            minWeightScale: 0.05,
            rowMinimumAmount: 1,
            rowMaximumAmount: 1,
            requirementsBonuses: [
              { levelRequirement: 30, levelMaxScaling: 60, relatedSkill: "fishing" },
            ],
          },
        ],
      },
    ];
    const resolved = resolveLootTableWeights(tableWithBonus, () => 60);
    expect(resolved[0].tableRows[0].rowWeight).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// mapTableToItems
// ---------------------------------------------------------------------------

describe("mapTableToItems", () => {
  it("flattens all rows from all sub-tables", () => {
    // soup_kitchen has 3 tables: 7-row + 1-row + 1-row = 9 rows total
    const ctx = makeCtxTable(soupKitchen);
    const rows = mapTableToItems(ctx);
    const totalRows = soupKitchen.reduce((n, t) => n + t.tableRows.length, 0);
    expect(rows).toHaveLength(totalRows);
  });

  it("enriches each row with context fields", () => {
    const ctx = makeCtxTable(soupKitchen, {
      type: ["normal"],
      rollAmount: 2,
      rollChance: 0.8,
      tableSource: "activity-soup_kitchen",
      slot: "chest",
      stat: "cookingBonus",
    });
    const rows = mapTableToItems(ctx);
    const row = rows[0];
    expect(row.rollAmount).toBe(2);
    expect(row.rollChance).toBe(0.8);
    expect(row.tableSource).toBe("activity-soup_kitchen");
    expect(row.slot).toBe("chest");
    expect(row.stat).toBe("cookingBonus");
    expect(row.type).toEqual(["normal"]);
  });

  it("computes correct tableWeight from row weights", () => {
    // soup_kitchen_volunteering rows: 5 + 4 + 2.5 + 0.02 + 5 + 4 + 2.5 = 23.02
    const ctx = makeCtxTable([soupKitchen[0]]);
    const rows = mapTableToItems(ctx);
    expect(rows[0].tableWeight).toBeCloseTo(23.02, 5);
    // All rows in the same table share the same tableWeight
    rows.forEach((row) => expect(row.tableWeight).toBeCloseTo(23.02, 5));
  });

  it("propagates noDropChance from the sub-table to each row", () => {
    const ctx = makeCtxTable([soupKitchen[0]]);
    const rows = mapTableToItems(ctx);
    rows.forEach((row) => expect(row.noDropChance).toBe(0.75));
  });

  it("returns empty array when tables is empty", () => {
    const ctx = makeCtxTable([]);
    expect(mapTableToItems(ctx)).toEqual([]);
  });

  it("skips tables with zero tableRows", () => {
    // treasure_hunter's first entry has an empty tableRows array
    const emptyTable = zipPouch[0]; // horn_of_respite_treasure_hunt, tableRows: []
    const ctx = makeCtxTable([emptyTable]);
    expect(mapTableToItems(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// groupSourcesByStat
// ---------------------------------------------------------------------------

describe("groupSourcesByStat", () => {
  const makeSources = (stats: (string | null | undefined)[]): MappedTableRow[] =>
    stats.map(
      (stat, i) =>
        ({
          rowItemID: `item_${i}`,
          rowWeight: 1,
          minWeightScale: 0.05,
          rowMinimumAmount: 1,
          rowMaximumAmount: 1,
          noDropChance: 0,
          tableWeight: 10,
          rollAmount: 1,
          type: ["normal"],
          tableSource: "test",
          rollChance: 1,
          stat,
        }) as MappedTableRow,
    );

  it("groups sources with the same stat key together", () => {
    const sources = makeSources(["fishFind", "fishFind", "chestFind"]);
    const grouped = groupSourcesByStat(sources);
    expect(grouped["fishFind"]).toHaveLength(2);
    expect(grouped["chestFind"]).toHaveLength(1);
  });

  it("uses 'default' key for null or undefined stat", () => {
    const sources = makeSources([null, undefined]);
    const grouped = groupSourcesByStat(sources);
    expect(grouped["default"]).toHaveLength(2);
  });

  it("returns one group per unique stat", () => {
    const sources = makeSources(["a", "b", "c"]);
    expect(Object.keys(groupSourcesByStat(sources))).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// getCombinedRollChance
// ---------------------------------------------------------------------------

describe("getCombinedRollChance", () => {
  const makeSources = (chances: number[]): MappedTableRow[] =>
    chances.map(
      (rollChance) =>
        ({
          rollChance,
          rowWeight: 1,
          minWeightScale: 0.05,
          rowMinimumAmount: 1,
          rowMaximumAmount: 1,
          noDropChance: 0,
          tableWeight: 10,
          rollAmount: 1,
          type: ["normal"],
          tableSource: "test",
        }) as MappedTableRow,
    );

  it("sums rollChance across sources", () => {
    expect(getCombinedRollChance(makeSources([0.5, 0.3]))).toBeCloseTo(0.8, 5);
  });

  it("handles a single source", () => {
    expect(getCombinedRollChance(makeSources([0.4]))).toBeCloseTo(0.4, 5);
  });

  it("returns 1 per source when rollChance is missing (defaults to 1)", () => {
    // @ts-expect-error intentionally omitting rollChance
    const sources = [{ tableSource: "test" }, { tableSource: "test" }] as MappedTableRow[];
    expect(getCombinedRollChance(sources)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeRollChance
// ---------------------------------------------------------------------------

describe("computeRollChance", () => {
  // Use raw_shrimp row from soup_kitchen: rowWeight=5, noDropChance=0.75
  // tableWeight=23.02 (computed above), rollChance=1
  const baseSource: MappedTableRow = {
    rowItemID: "raw_shrimp",
    rowWeight: 5,
    minWeightScale: 0.05,
    rowMinimumAmount: 1,
    rowMaximumAmount: 1,
    noDropChance: 0.75,
    tableWeight: 23.02,
    rollAmount: 1,
    type: ["normal"],
    tableSource: "activity-soup_kitchen",
    rollChance: 1,
  };

  it("computes base roll chance correctly", () => {
    // (1 - 0.75) * min(1, 1) * (5 / 23.02) * 1
    const expected = 0.25 * (5 / 23.02);
    expect(computeRollChance(baseSource, null, 1)).toBeCloseTo(expected, 5);
  });

  it("applies multiplier to the result", () => {
    const base = computeRollChance(baseSource, null, 1);
    expect(computeRollChance(baseSource, null, 2)).toBeCloseTo(base * 2, 5);
  });

  it("caps effective rollChance at 1 when combinedRollChance > 1", () => {
    const capped = computeRollChance(baseSource, 5, 1);
    const uncapped = computeRollChance(baseSource, null, 1);
    expect(capped).toBeCloseTo(uncapped, 5);
  });

  it("scales proportionally with combinedRollChance < 1", () => {
    const half = computeRollChance(baseSource, 0.5, 1);
    const full = computeRollChance(baseSource, 1, 1);
    expect(half).toBeCloseTo(full * 0.5, 5);
  });

  it("returns 0 when noDropChance is 1", () => {
    expect(computeRollChance({ ...baseSource, noDropChance: 1 }, null, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeSourceDropChance
// ---------------------------------------------------------------------------

describe("computeSourceDropChance", () => {
  const singleRollSource: MappedTableRow = {
    rowItemID: "agility_chest",
    rowWeight: 10,
    minWeightScale: 0.05,
    rowMinimumAmount: 1,
    rowMaximumAmount: 1,
    noDropChance: 0.996,
    tableWeight: 10,
    rollAmount: 1,
    type: ["chestTable"],
    tableSource: "activity-test",
    rollChance: 1,
  };

  it("equals computeRollChance for rollAmount=1", () => {
    const rc = computeRollChance(singleRollSource, null, 1);
    expect(computeSourceDropChance(singleRollSource, null, 1)).toBeCloseTo(rc, 8);
  });

  it("increases drop chance with higher rollAmount", () => {
    const one = computeSourceDropChance(singleRollSource, null, 1);
    const five = computeSourceDropChance({ ...singleRollSource, rollAmount: 5 }, null, 1);
    expect(five).toBeGreaterThan(one);
  });

  it("never exceeds 1", () => {
    const result = computeSourceDropChance(
      { ...singleRollSource, noDropChance: 0, rollAmount: 1000 },
      null,
      10,
    );
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// getTotalDropChance
// ---------------------------------------------------------------------------

describe("getTotalDropChance", () => {
  const noMultiplier = (_type: string[]) => 1;

  const makeGrouped = (
    sources: Partial<MappedTableRow>[],
    statKey = "default",
  ): Record<string, MappedTableRow[]> => ({
    [statKey]: sources.map(
      (s) =>
        ({
          rowItemID: "item",
          rowWeight: 5,
          minWeightScale: 0.05,
          rowMinimumAmount: 1,
          rowMaximumAmount: 1,
          noDropChance: 0.75,
          tableWeight: 23.02,
          rollAmount: 1,
          type: ["normal"],
          tableSource: "test",
          rollChance: 1,
          ...s,
        }) as MappedTableRow,
    ),
  });

  it("returns a number between 0 and 100", () => {
    const grouped = makeGrouped([{}]);
    const result = getTotalDropChance(grouped, noMultiplier);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("is higher with two stat groups than one", () => {
    const one = getTotalDropChance(makeGrouped([{}]), noMultiplier);
    const two = getTotalDropChance(
      { ...makeGrouped([{}], "statA"), ...makeGrouped([{}], "statB") },
      noMultiplier,
    );
    expect(two).toBeGreaterThan(one);
  });

  it("is higher with a multiplier > 1", () => {
    const grouped = makeGrouped([{}]);
    const base = getTotalDropChance(grouped, noMultiplier);
    const boosted = getTotalDropChance(grouped, () => 2);
    expect(boosted).toBeGreaterThan(base);
  });

  it("rounds to 4 decimal places", () => {
    const grouped = makeGrouped([{}]);
    const result = getTotalDropChance(grouped, noMultiplier);
    const decimals = result.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(4);
  });

  it("computes correct value for soup-kitchen raw_shrimp row", () => {
    // noDropChance=0.75, rowWeight=5, tableWeight=23.02, rollChance=1, rollAmount=1
    // rollChance = 0.25 * (5/23.02) * 1 ≈ 0.054301
    // drop chance = 1 - (1 - 0.054301)^1 = 0.054301
    // total = Math.round(100 * 0.054301 * 10000) / 10000 ≈ 5.4301
    const source: MappedTableRow = {
      rowItemID: "raw_shrimp",
      rowWeight: 5,
      minWeightScale: 0.05,
      rowMinimumAmount: 1,
      rowMaximumAmount: 1,
      noDropChance: 0.75,
      tableWeight: 23.02,
      rollAmount: 1,
      type: ["normal"],
      tableSource: "activity-soup_kitchen",
      rollChance: 1,
    };
    const grouped = { default: [source] };
    const result = getTotalDropChance(grouped, noMultiplier);
    expect(result).toBeCloseTo(0.25 * (5 / 23.02) * 100, 3);
  });
});

// ---------------------------------------------------------------------------
// getStepsPerItem
// ---------------------------------------------------------------------------

describe("getStepsPerItem", () => {
  const noMultiplier = (_type: string[]) => 1;

  const uniformSource: MappedTableRow = {
    rowItemID: "raw_shrimp",
    rowWeight: 5,
    minWeightScale: 0.05,
    rowMinimumAmount: 1,
    rowMaximumAmount: 1,
    noDropChance: 0.75,
    tableWeight: 23.02,
    rollAmount: 1,
    type: ["normal"],
    tableSource: "test",
    rollChance: 1,
  };

  it("returns a positive finite number", () => {
    const grouped = { default: [uniformSource] };
    const result = getStepsPerItem(grouped, 100, noMultiplier);
    expect(result).toBeGreaterThan(0);
    expect(isFinite(result)).toBe(true);
  });

  it("decreases steps per item with a higher multiplier", () => {
    const grouped = { default: [uniformSource] };
    const base = getStepsPerItem(grouped, 100, noMultiplier);
    const boosted = getStepsPerItem(grouped, 100, () => 2);
    expect(boosted).toBeLessThan(base);
  });

  it("decreases steps per item with more stepsPerRewardRoll scaling proportionally", () => {
    const grouped = { default: [uniformSource] };
    const low = getStepsPerItem(grouped, 100, noMultiplier);
    const high = getStepsPerItem(grouped, 200, noMultiplier);
    expect(high).toBeCloseTo(low * 2, 5);
  });

  it("accounts for multiple stat groups by combining harmonic rate", () => {
    const grouped = {
      statA: [uniformSource],
      statB: [uniformSource],
    };
    const combined = getStepsPerItem(grouped, 100, noMultiplier);
    const single = getStepsPerItem({ statA: [uniformSource] }, 100, noMultiplier);
    // Two independent identical sources → half the steps
    expect(combined).toBeCloseTo(single / 2, 5);
  });
});

// ---------------------------------------------------------------------------
// getDropCounts
// ---------------------------------------------------------------------------

describe("getDropCounts", () => {
  const makeGrouped = (
    amounts: Array<[number, number]>,
  ): Record<string, MappedTableRow[]> =>
    Object.fromEntries(
      amounts.map(([min, max], i) => [
        `stat_${i}`,
        [
          {
            rowItemID: `item_${i}`,
            rowMinimumAmount: min,
            rowMaximumAmount: max,
          } as MappedTableRow,
        ],
      ]),
    );

  it("returns a single number string when min equals max", () => {
    expect(getDropCounts(makeGrouped([[3, 3]]))).toBe("3");
  });

  it("returns a range string when min differs from max", () => {
    expect(getDropCounts(makeGrouped([[1, 4]]))).toBe("1-4");
  });

  it("joins multiple stat groups with ', '", () => {
    expect(getDropCounts(makeGrouped([[1, 1], [2, 5]]))).toBe("1, 2-5");
  });

  it("reflects swimming intermediate row amounts correctly", () => {
    // First row of swimming: min=1, max=4
    const ctx = makeCtxTable([swimming[0]]);
    const rows = mapTableToItems(ctx);
    const grouped = groupSourcesByStat(rows);
    // All from "default" stat group, show the first source's amounts
    // swimming[0] first row: 1-4
    const counts = getDropCounts({ default: [rows[0]] });
    expect(counts).toBe("1-4");
  });
});
