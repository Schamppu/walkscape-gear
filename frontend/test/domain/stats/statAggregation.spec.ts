import { describe, it, expect } from "vitest";
import {
  sumStatValues,
  computeApplicableTotal,
} from "@/domain/stats/statAggregation";
import type { StatTotals } from "@/domain/stats/statAggregation";

// ---------------------------------------------------------------------------
// sumStatValues
// ---------------------------------------------------------------------------

describe("sumStatValues", () => {
  it("returns 0 for an empty array", () => {
    expect(sumStatValues([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(sumStatValues([{ value: 5 }])).toBe(5);
  });

  it("sums all values correctly", () => {
    expect(sumStatValues([{ value: 1 }, { value: 2 }, { value: 3 }])).toBe(6);
  });

  it("handles negative values", () => {
    expect(sumStatValues([{ value: 10 }, { value: -3 }])).toBe(7);
  });

  it("handles fractional values", () => {
    expect(sumStatValues([{ value: 0.1 }, { value: 0.2 }])).toBeCloseTo(0.3);
  });
});

// ---------------------------------------------------------------------------
// computeApplicableTotal — missing entries
// ---------------------------------------------------------------------------

describe("computeApplicableTotal — missing entries", () => {
  it("returns zero bucket when totalsByStat is empty", () => {
    expect(computeApplicableTotal({}, "workEfficiency", false)).toEqual({
      sum: 0,
      positive: 0,
      negative: 0,
    });
  });

  it("returns zero bucket when the stat type is not in the map", () => {
    const totals: StatTotals = {
      otherStat: {
        flat: { sum: 5, positive: 5, negative: 0 },
        percent: { sum: 0, positive: 0, negative: 0 },
      },
    };
    expect(computeApplicableTotal(totals, "workEfficiency", false)).toEqual({
      sum: 0,
      positive: 0,
      negative: 0,
    });
  });

  it("returns zero bucket when the key (flat/percent) is missing", () => {
    const totals: StatTotals = {
      workEfficiency: {
        flat: { sum: 2, positive: 2, negative: 0 },
        percent: { sum: 0, positive: 0, negative: 0 },
      },
    };
    // percent key is missing from the type definition when not set,
    // but we can simulate by passing a narrowed object
    const narrowed = { workEfficiency: { flat: totals.workEfficiency.flat } } as unknown as StatTotals;
    expect(computeApplicableTotal(narrowed, "workEfficiency", true)).toEqual({
      sum: 0,
      positive: 0,
      negative: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// computeApplicableTotal — found entries
// ---------------------------------------------------------------------------

describe("computeApplicableTotal — found entries", () => {
  const totals: StatTotals = {
    workEfficiency: {
      flat: { sum: 0.5, positive: 0.5, negative: 0 },
      percent: { sum: 0.1, positive: 0.2, negative: -0.1 },
    },
    qualityOutcome: {
      flat: { sum: -3, positive: 0, negative: -3 },
      percent: { sum: 0, positive: 0, negative: 0 },
    },
  };

  it("returns the flat bucket when isPercent is false", () => {
    expect(computeApplicableTotal(totals, "workEfficiency", false)).toEqual({
      sum: 0.5,
      positive: 0.5,
      negative: 0,
    });
  });

  it("returns the percent bucket when isPercent is true", () => {
    expect(computeApplicableTotal(totals, "workEfficiency", true)).toEqual({
      sum: 0.1,
      positive: 0.2,
      negative: -0.1,
    });
  });

  it("works for a different stat type", () => {
    expect(computeApplicableTotal(totals, "qualityOutcome", false)).toEqual({
      sum: -3,
      positive: 0,
      negative: -3,
    });
  });
});
