import { describe, it, expect } from "vitest";
import { filterLocations, filterDirectUpgrades } from "@/domain/optimiser/gear";
import { makeLocation, makeOptimiserItem } from "../../fixtures/optimiser";

// ---------------------------------------------------------------------------
// filterLocations
// ---------------------------------------------------------------------------

describe("filterLocations", () => {
  it("returns an empty array for empty input", () => {
    expect(filterLocations([])).toEqual([]);
  });

  it("keeps a single location unchanged", () => {
    const loc = makeLocation("loc1", "faction_a", ["forest"]);
    expect(filterLocations([loc])).toEqual([loc]);
  });

  it("deduplicates locations with identical faction and keywords", () => {
    const a = makeLocation("loc1", "faction_a", ["forest"]);
    const b = makeLocation("loc2", "faction_a", ["forest"]);
    const result = filterLocations([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(a);
  });

  it("keeps locations with different factions separate", () => {
    const a = makeLocation("loc1", "faction_a", ["forest"]);
    const b = makeLocation("loc2", "faction_b", ["forest"]);
    expect(filterLocations([a, b])).toHaveLength(2);
  });

  it("keeps locations with different keywords separate", () => {
    const a = makeLocation("loc1", "faction_a", ["forest"]);
    const b = makeLocation("loc2", "faction_a", ["mountain"]);
    expect(filterLocations([a, b])).toHaveLength(2);
  });

  it("keeps the first occurrence when duplicates are found", () => {
    const first = makeLocation("first", "faction_a", ["cave"]);
    const second = makeLocation("second", "faction_a", ["cave"]);
    const result = filterLocations([first, second]);
    expect(result[0].id).toBe("first");
  });

  it("handles locations with multiple keywords correctly", () => {
    const a = makeLocation("loc1", "faction_a", ["forest", "river"]);
    const b = makeLocation("loc2", "faction_a", ["forest", "river"]);
    const c = makeLocation("loc3", "faction_a", ["forest"]);
    const result = filterLocations([a, b, c]);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// filterDirectUpgrades
// ---------------------------------------------------------------------------

describe("filterDirectUpgrades", () => {
  it("returns an empty array for empty input", () => {
    expect(filterDirectUpgrades([])).toEqual([]);
  });

  it("keeps a single item unchanged", () => {
    const item = makeOptimiserItem("a", [{ stat: "work_efficiency", value: 0.1 }]);
    expect(filterDirectUpgrades([item])).toHaveLength(1);
  });

  it("removes an item dominated by a strictly better item (same stat, higher value)", () => {
    const strong = makeOptimiserItem("strong", [{ stat: "work_efficiency", isPercent: true, value: 0.2 }]);
    const weak = makeOptimiserItem("weak", [{ stat: "work_efficiency", isPercent: true, value: 0.1 }]);
    const result = filterDirectUpgrades([strong, weak]);
    expect(result.map((i) => i.id)).toContain("strong");
    expect(result.map((i) => i.id)).not.toContain("weak");
  });

  it("keeps both items when they have different stats (neither dominates)", () => {
    const a = makeOptimiserItem("a", [{ stat: "work_efficiency", isPercent: true, value: 0.2 }]);
    const b = makeOptimiserItem("b", [{ stat: "double_action", isPercent: true, value: 0.1 }]);
    const result = filterDirectUpgrades([a, b]);
    expect(result).toHaveLength(2);
  });

  it("removes an item dominated by another item with additional stats", () => {
    const a = makeOptimiserItem("a", [
      { stat: "work_efficiency", isPercent: true, value: 0.2 },
      { stat: "double_action", isPercent: true, value: 0.1 },
    ]);
    const b = makeOptimiserItem("b", [{ stat: "work_efficiency", isPercent: true, value: 0.2 }]);
    // a dominates b: a has all of b's stats with equal/higher values, and at least one strictly greater
    const result = filterDirectUpgrades([a, b]);
    expect(result.map((i) => i.id)).toContain("a");
    expect(result.map((i) => i.id)).not.toContain("b");
  });

  it("removes an item with zero stats when any other item has at least one stat", () => {
    const withStats = makeOptimiserItem("a", [{ stat: "work_efficiency", isPercent: true, value: 0.1 }]);
    const empty = makeOptimiserItem("empty", []);
    const result = filterDirectUpgrades([withStats, empty]);
    expect(result.map((i) => i.id)).toContain("a");
    expect(result.map((i) => i.id)).not.toContain("empty");
  });

  it("keeps equal items (neither dominates the other when values are identical)", () => {
    const a = makeOptimiserItem("a", [{ stat: "work_efficiency", isPercent: true, value: 0.1 }]);
    const b = makeOptimiserItem("b", [{ stat: "work_efficiency", isPercent: true, value: 0.1 }]);
    const result = filterDirectUpgrades([a, b]);
    expect(result).toHaveLength(2);
  });

  it("respects the areMutuallyExclusive guard: non-exclusive items are never filtered", () => {
    // Even if a dominates b statistically, if they are NOT mutually exclusive
    // (i.e. both could be equipped at once), neither should be removed.
    const strong = makeOptimiserItem("strong", [{ stat: "work_efficiency", isPercent: true, value: 0.5 }]);
    const weak = makeOptimiserItem("weak", [{ stat: "work_efficiency", isPercent: true, value: 0.1 }]);
    const notExclusive = () => false; // they can co-exist
    const result = filterDirectUpgrades([strong, weak], notExclusive);
    expect(result).toHaveLength(2);
  });

  it("filters dominated item when areMutuallyExclusive returns true", () => {
    const strong = makeOptimiserItem("strong", [{ stat: "work_efficiency", isPercent: true, value: 0.5 }]);
    const weak = makeOptimiserItem("weak", [{ stat: "work_efficiency", isPercent: true, value: 0.1 }]);
    const alwaysExclusive = () => true;
    const result = filterDirectUpgrades([strong, weak], alwaysExclusive);
    expect(result.map((i) => i.id)).not.toContain("weak");
  });
});
