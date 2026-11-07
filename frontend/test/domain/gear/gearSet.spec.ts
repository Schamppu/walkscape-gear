import { describe, it, expect } from "vitest";
import {
  createEmptyGearSet,
  createEmptyGearSetSelection,
} from "@/domain/gear/gearSet";
import { gearSlots } from "@/domain/constants/gear";

// ---------------------------------------------------------------------------
// createEmptyGearSet
// ---------------------------------------------------------------------------

describe("createEmptyGearSet", () => {
  it("contains every gear slot as a key", () => {
    const gs = createEmptyGearSet();
    for (const slot of gearSlots) {
      expect(gs).toHaveProperty(slot);
    }
  });

  it("all slot values are null", () => {
    const gs = createEmptyGearSet();
    for (const slot of gearSlots) {
      expect(gs[slot]).toBeNull();
    }
  });

  it("has exactly as many keys as there are gear slots", () => {
    const gs = createEmptyGearSet();
    expect(Object.keys(gs)).toHaveLength(gearSlots.length);
  });

  it("returns a fresh object on each call (not the same reference)", () => {
    const a = createEmptyGearSet();
    const b = createEmptyGearSet();
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// createEmptyGearSetSelection
// ---------------------------------------------------------------------------

describe("createEmptyGearSetSelection", () => {
  it("has null id", () => {
    expect(createEmptyGearSetSelection().id).toBeNull();
  });

  it("has empty string name", () => {
    expect(createEmptyGearSetSelection().name).toBe("");
  });

  it("isDirty is false", () => {
    expect(createEmptyGearSetSelection().isDirty).toBe(false);
  });

  it("isNew is true", () => {
    expect(createEmptyGearSetSelection().isNew).toBe(true);
  });

  it("tags and items start as empty arrays", () => {
    const sel = createEmptyGearSetSelection();
    expect(sel.tags).toEqual([]);
    expect(sel.items).toEqual([]);
  });

  it("returns a fresh object on each call — arrays are independent", () => {
    const a = createEmptyGearSetSelection();
    const b = createEmptyGearSetSelection();
    expect(a).not.toBe(b);
    a.tags.push("x");
    expect(b.tags).toHaveLength(0);
  });
});
