import { describe, it, expect } from "vitest";
import {
  partitionDropKeys,
  compareDrops,
} from "@/domain/comparison/dropsComparison";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { MappedTableRow } from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeDropInfo(
  id: string,
  stepsPerItem: number,
  overrides: Partial<DropItemInfo> = {},
): DropItemInfo {
  return {
    id,
    icon: `icons/${id}.png`,
    sources: [] as MappedTableRow[],
    totalDropChance: 0.1,
    stepsPerItem,
    itemsPerStep: 1000 / stepsPerItem,
    stepsPerNormal: stepsPerItem * 1.1,
    stepsPerFine: stepsPerItem * 5,
    stepsPerRare: stepsPerItem * 10,
    dropCounts: "1",
    variableRequirement: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("partitionDropKeys — edge cases", () => {
  it("returns all-empty arrays for two empty maps", () => {
    expect(partitionDropKeys({}, {})).toEqual({
      both: [],
      onlyA: [],
      onlyB: [],
    });
  });

  it("puts all keys of A in onlyA when B is empty", () => {
    const A = { x: 1, y: 2 };
    const { both, onlyA, onlyB } = partitionDropKeys(A, {});
    expect(both).toHaveLength(0);
    expect(onlyA).toEqual(expect.arrayContaining(["x", "y"]));
    expect(onlyB).toHaveLength(0);
  });

  it("puts all keys of B in onlyB when A is empty", () => {
    const B = { x: 1, y: 2 };
    const { both, onlyA, onlyB } = partitionDropKeys({}, B);
    expect(both).toHaveLength(0);
    expect(onlyA).toHaveLength(0);
    expect(onlyB).toEqual(expect.arrayContaining(["x", "y"]));
  });
});

// ---------------------------------------------------------------------------
// Partitioning
// ---------------------------------------------------------------------------

describe("partitionDropKeys — partitioning", () => {
  it("puts shared keys in both", () => {
    const A = { iron: 1, gold: 2 };
    const B = { iron: 3, silver: 4 };
    const { both } = partitionDropKeys(A, B);
    expect(both).toEqual(["iron"]);
  });

  it("puts keys only in A into onlyA", () => {
    const A = { iron: 1, gold: 2 };
    const B = { iron: 3 };
    const { onlyA } = partitionDropKeys(A, B);
    expect(onlyA).toEqual(["gold"]);
  });

  it("puts keys only in B into onlyB", () => {
    const A = { iron: 1 };
    const B = { iron: 3, silver: 4 };
    const { onlyB } = partitionDropKeys(A, B);
    expect(onlyB).toEqual(["silver"]);
  });

  it("correctly handles all three groups at once", () => {
    const A = { a: 1, b: 2, c: 3 };
    const B = { b: 4, c: 5, d: 6 };
    const { both, onlyA, onlyB } = partitionDropKeys(A, B);
    expect(both).toEqual(expect.arrayContaining(["b", "c"]));
    expect(both).toHaveLength(2);
    expect(onlyA).toEqual(["a"]);
    expect(onlyB).toEqual(["d"]);
  });

  it("the three groups are disjoint and cover all keys", () => {
    const A = { x: 1, y: 2, z: 3 };
    const B = { y: 4, z: 5, w: 6 };
    const { both, onlyA, onlyB } = partitionDropKeys(A, B);
    const allKeys = new Set([...both, ...onlyA, ...onlyB]);
    const expected = new Set([...Object.keys(A), ...Object.keys(B)]);
    expect(allKeys).toEqual(expected);
    // verify disjoint
    expect(both.filter((k) => onlyA.includes(k))).toHaveLength(0);
    expect(both.filter((k) => onlyB.includes(k))).toHaveLength(0);
    expect(onlyA.filter((k) => onlyB.includes(k))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Value independence
// ---------------------------------------------------------------------------

describe("partitionDropKeys — value independence", () => {
  it("partitions by key presence only, ignoring values", () => {
    // Even if values are different objects, shared keys still go to 'both'
    const A = { item: { stepsPerItem: 100 } };
    const B = { item: { stepsPerItem: 200 } };
    const { both } = partitionDropKeys(A, B);
    expect(both).toEqual(["item"]);
  });
});

// ---------------------------------------------------------------------------
// compareDrops — edge cases
// ---------------------------------------------------------------------------

describe("compareDrops — edge cases", () => {
  it("returns an empty array for two empty maps", () => {
    expect(compareDrops({}, {})).toEqual([]);
  });

  it("produces null g2 for an A-only item", () => {
    const A = { iron: makeDropInfo("iron", 100) };
    const [row] = compareDrops(A, {});
    expect(row.g1).not.toBeNull();
    expect(row.g2).toBeNull();
  });

  it("produces null g1 for a B-only item", () => {
    const B = { iron: makeDropInfo("iron", 100) };
    const [row] = compareDrops({}, B);
    expect(row.g1).toBeNull();
    expect(row.g2).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// compareDrops — comp sign convention
// ---------------------------------------------------------------------------

describe("compareDrops — comp sign convention", () => {
  it("positive comp means A needs more steps (A worse)", () => {
    const A = { iron: makeDropInfo("iron", 200) };
    const B = { iron: makeDropInfo("iron", 100) };
    const [row] = compareDrops(A, B);
    expect(row.comp).toBeGreaterThan(0);
  });

  it("negative comp means A needs fewer steps (A better)", () => {
    const A = { iron: makeDropInfo("iron", 100) };
    const B = { iron: makeDropInfo("iron", 200) };
    const [row] = compareDrops(A, B);
    expect(row.comp).toBeLessThan(0);
  });

  it("zero comp when both have identical stepsPerItem", () => {
    const A = { iron: makeDropInfo("iron", 150) };
    const B = { iron: makeDropInfo("iron", 150) };
    const [row] = compareDrops(A, B);
    expect(row.comp).toBe(0);
  });

  it("single-side items have comp = 0", () => {
    const A = { iron: makeDropInfo("iron", 100) };
    const [row] = compareDrops(A, {});
    expect(row.comp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// compareDrops — row order and content
// ---------------------------------------------------------------------------

describe("compareDrops — row structure", () => {
  it("preserves id and icon from the A-side info", () => {
    const A = { iron: makeDropInfo("iron", 100) };
    const B = { iron: makeDropInfo("iron", 200) };
    const [row] = compareDrops(A, B);
    expect(row.id).toBe("iron");
    expect(row.icon).toBe("icons/iron.png");
  });

  it("both-items appear before A-only then B-only items", () => {
    const A = {
      shared: makeDropInfo("shared", 100),
      aOnly: makeDropInfo("aOnly", 50),
    };
    const B = {
      shared: makeDropInfo("shared", 200),
      bOnly: makeDropInfo("bOnly", 75),
    };
    const rows = compareDrops(A, B);
    expect(rows[0].id).toBe("shared");
    expect(rows[1].id).toBe("aOnly");
    expect(rows[2].id).toBe("bOnly");
  });

  it("g1 step values match source DropItemInfo", () => {
    const info = makeDropInfo("iron", 100, {
      stepsPerNormal: 110,
      stepsPerFine: 500,
      stepsPerRare: 1000,
    });
    const A = { iron: info };
    const [row] = compareDrops(A, {});
    expect(row.g1?.stepsPerItem).toBe(100);
    expect(row.g1?.stepsPerNormal).toBe(110);
    expect(row.g1?.stepsPerFine).toBe(500);
    expect(row.g1?.stepsPerRare).toBe(1000);
  });
});
