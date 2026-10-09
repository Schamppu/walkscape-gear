import { describe, it, expect } from "vitest";
import {
  consumableCounts,
  consumableEntryFields,
  toCount,
} from "@/domain/items/consumableCounts";

describe("consumableCounts", () => {
  it("splits the total into common and fine", () => {
    expect(consumableCounts({ quantity: 10, quantityFine: 3 })).toEqual({ common: 7, fine: 3 });
  });

  it("treats a missing entry or fine count as 0", () => {
    expect(consumableCounts(undefined)).toEqual({ common: 0, fine: 0 });
    expect(consumableCounts({ quantity: 4 })).toEqual({ common: 4, fine: 0 });
  });

  it("never returns a negative common count", () => {
    expect(consumableCounts({ quantity: 1, quantityFine: 3 })).toEqual({ common: 0, fine: 3 });
  });
});

describe("consumableEntryFields", () => {
  it("derives the total, flags and ownership", () => {
    expect(consumableEntryFields(2, 1)).toEqual({
      owned: true,
      quantity: 3,
      quantityFine: 1,
      consumableCommon: true,
      consumableFine: true,
    });
    expect(consumableEntryFields(0, 0)).toEqual({
      owned: false,
      quantity: 0,
      quantityFine: 0,
      consumableCommon: false,
      consumableFine: false,
    });
  });

  it("clamps counts to whole numbers ≥ 0", () => {
    expect(consumableEntryFields(-2, 1.7)).toMatchObject({ quantity: 1, quantityFine: 1, consumableCommon: false });
  });
});

describe("toCount", () => {
  it.each([
    ["5", 5],
    [2.9, 2],
    [-1, 0],
    ["", 0],
    ["abc", 0],
  ])("%o → %o", (input, expected) => {
    expect(toCount(input)).toBe(expected);
  });
});
