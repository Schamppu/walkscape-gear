import { describe, it, expect } from "vitest";
import { partitionDropKeys } from "@/domain/comparison/dropsComparison";

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("partitionDropKeys — edge cases", () => {
  it("returns all-empty arrays for two empty maps", () => {
    expect(partitionDropKeys({}, {})).toEqual({ both: [], onlyA: [], onlyB: [] });
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
