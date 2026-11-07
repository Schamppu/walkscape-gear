import { describe, it, expect } from "vitest";
import { getItemEntryQualities } from "@/domain/gear/itemEntryQualities";

describe("getItemEntryQualities", () => {
  it("returns 0 for non-crafted items regardless of gearType", () => {
    expect(getItemEntryQualities({ type: "loot", gearType: "ring" })).toBe(0);
    expect(getItemEntryQualities({ type: "consumable", gearType: null })).toBe(
      0,
    );
    expect(getItemEntryQualities({ type: "collectible", gearType: null })).toBe(
      0,
    );
  });

  it("returns 2 for crafted rings", () => {
    expect(getItemEntryQualities({ type: "crafted", gearType: "ring" })).toBe(
      2,
    );
  });

  it("returns 1 for crafted non-ring gear types", () => {
    expect(getItemEntryQualities({ type: "crafted", gearType: "chest" })).toBe(
      1,
    );
    expect(getItemEntryQualities({ type: "crafted", gearType: "head" })).toBe(
      1,
    );
    expect(getItemEntryQualities({ type: "crafted", gearType: "tool" })).toBe(
      1,
    );
    expect(getItemEntryQualities({ type: "crafted", gearType: "neck" })).toBe(
      1,
    );
  });

  it("returns 1 for crafted items with null gearType", () => {
    expect(getItemEntryQualities({ type: "crafted", gearType: null })).toBe(1);
  });
});
