import { describe, it, expect } from "vitest";
import { buildCraftingOddsComparison } from "@/domain/comparison/craftingQualityComparison";
import type { QualityOutcomeResult } from "@/domain/quality/qualityOutcomeOdds";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOutcome(
  name: string,
  value: number,
  materialsNeeded: number,
): QualityOutcomeResult {
  return {
    qualityValue: name.toLowerCase(),
    name,
    value,
    crafts: 1 / value,
    odds: value * 100,
    materialsNeeded,
  };
}

const tiers1: QualityOutcomeResult[] = [
  makeOutcome("Common", 0.6, 2),
  makeOutcome("Fine", 0.3, 4),
  makeOutcome("Rare", 0.1, 10),
];

const tiers2: QualityOutcomeResult[] = [
  makeOutcome("Common", 0.5, 2.5),
  makeOutcome("Fine", 0.35, 3.5),
  makeOutcome("Rare", 0.15, 8),
];

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("buildCraftingOddsComparison — edge cases", () => {
  it("returns an empty array when both inputs are empty", () => {
    expect(buildCraftingOddsComparison([], [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe("buildCraftingOddsComparison — structure", () => {
  it("returns one row per quality tier", () => {
    expect(buildCraftingOddsComparison(tiers1, tiers2)).toHaveLength(3);
  });

  it("each row contains gs1 and gs2 from the input arrays", () => {
    const rows = buildCraftingOddsComparison(tiers1, tiers2);
    expect(rows[0].gs1).toBe(tiers1[0]);
    expect(rows[0].gs2).toBe(tiers2[0]);
    expect(rows[1].gs1).toBe(tiers1[1]);
    expect(rows[1].gs2).toBe(tiers2[1]);
  });
});

// ---------------------------------------------------------------------------
// Comparison values
// ---------------------------------------------------------------------------

describe("buildCraftingOddsComparison — comparison values", () => {
  it("oddsComp is gs1.value - gs2.value", () => {
    const rows = buildCraftingOddsComparison(tiers1, tiers2);
    // Common: 0.6 - 0.5 = 0.1 (gs1 better odds)
    expect(rows[0].oddsComp).toBeCloseTo(0.1);
    // Fine: 0.3 - 0.35 = -0.05 (gs2 better odds)
    expect(rows[1].oddsComp).toBeCloseTo(-0.05);
  });

  it("positive oddsComp means gs1 has higher probability for that tier", () => {
    const rows = buildCraftingOddsComparison(tiers1, tiers2);
    expect(rows[0].oddsComp).toBeGreaterThan(0); // gs1 Common odds > gs2
  });

  it("matsComp is gs2.materialsNeeded - gs1.materialsNeeded", () => {
    const rows = buildCraftingOddsComparison(tiers1, tiers2);
    // Common: 2.5 - 2 = 0.5 (gs1 needs fewer materials)
    expect(rows[0].matsComp).toBeCloseTo(0.5);
    // Rare: 8 - 10 = -2 (gs2 needs fewer materials)
    expect(rows[2].matsComp).toBeCloseTo(-2);
  });

  it("positive matsComp means gs1 needs fewer materials", () => {
    const rows = buildCraftingOddsComparison(tiers1, tiers2);
    expect(rows[0].matsComp).toBeGreaterThan(0);
  });
});
