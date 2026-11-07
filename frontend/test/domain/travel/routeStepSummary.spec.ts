import { describe, it, expect, vi } from "vitest";
import {
  calculateRouteStepSummary,
  aggregateRouteStats,
  mapSegmentRequirements,
} from "@/domain/travel/routeStepSummary";
import type {
  SegmentForSummary,
  SegmentWithRequirements,
} from "@/domain/travel/routeStepSummary";
import type { RouteSegmentStats } from "@/domain/types/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStats(
  overrides: Partial<RouteSegmentStats> = {},
): RouteSegmentStats {
  return {
    maxWorkEfficiency: 0,
    workEfficiency: 0,
    uncappedWorkEfficiency: 0,
    effectiveMaxWorkEfficiency: 0,
    doubleAction: 0,
    stepsRequiredPercent: 1,
    stepsRequiredFlat: 0,
    ...overrides,
  };
}

function makeSegment(
  distance: number,
  statsOverrides: Partial<RouteSegmentStats> = {},
): SegmentForSummary {
  return { distance, stats: makeStats(statsOverrides) };
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("calculateRouteStepSummary — edge cases", () => {
  it("returns all zeros for an empty segments array", () => {
    expect(calculateRouteStepSummary([])).toEqual({
      totalAverage: 0,
      totalMin: 0,
      totalMax: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Single segment — no double action
// ---------------------------------------------------------------------------

describe("calculateRouteStepSummary — no double action", () => {
  it("totalMin equals totalMax when doubleAction is 0", () => {
    // distance=100, WE=0: stepsPerNode = ceil(max(10, 100/1/10)) = 10
    // totalMax = 10 * 10 = 100; totalMin = 10 * 10 = 100 (minCompletions=10)
    const { totalMin, totalMax } = calculateRouteStepSummary([
      makeSegment(100),
    ]);
    expect(totalMin).toBe(totalMax);
  });

  it("totalAverage equals totalMax when doubleAction is 0", () => {
    // averageStepsPerRoute = ceil(stepsPerNode * 10/(1+0)) = stepsPerNode*10 = totalMax
    const { totalAverage, totalMax } = calculateRouteStepSummary([
      makeSegment(100),
    ]);
    expect(totalAverage).toBe(totalMax);
  });
});

// ---------------------------------------------------------------------------
// Single segment — with double action
// ---------------------------------------------------------------------------

describe("calculateRouteStepSummary — with double action", () => {
  it("totalMin is less than totalMax when doubleAction > 0", () => {
    const { totalMin, totalMax } = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 0.5, workEfficiency: 0 }),
    ]);
    expect(totalMin).toBeLessThan(totalMax);
  });

  it("totalMin uses 5 completions when doubleAction > 0", () => {
    // distance=100, WE=0: stepsPerNode = 10; minCompletions = 5 → totalMin = 50
    const { totalMin } = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 0.1 }),
    ]);
    expect(totalMin).toBe(50);
  });

  it("totalMax uses 10 completions when doubleAction is between 0 and 1", () => {
    // distance=100, WE=0: stepsPerNode = 10; totalMax = 100
    const { totalMax } = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 0.5 }),
    ]);
    expect(totalMax).toBe(100);
  });

  it("totalMax uses 5 completions when doubleAction is exactly 1 (100%)", () => {
    // At 100% DA every step always doubles, so worst-case is also 5 completions
    // distance=100, WE=0: stepsPerNode = 10; totalMax = 50
    const { totalMax } = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 1 }),
    ]);
    expect(totalMax).toBe(50);
  });

  it("totalMin equals totalMax when doubleAction is exactly 1", () => {
    const { totalMin, totalMax } = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 1 }),
    ]);
    expect(totalMin).toBe(totalMax);
  });

  it("totalAverage is between totalMin and totalMax when doubleAction > 0", () => {
    const result = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 0.5 }),
    ]);
    expect(result.totalAverage).toBeGreaterThanOrEqual(result.totalMin);
    expect(result.totalAverage).toBeLessThanOrEqual(result.totalMax);
  });
});

// ---------------------------------------------------------------------------
// Multiple segments
// ---------------------------------------------------------------------------

describe("calculateRouteStepSummary — multiple segments", () => {
  it("sums totals across all segments", () => {
    // seg1: dist=100, no DA → avg=100, min=100, max=100
    // seg2: dist=200, no DA → stepsPerNode=20, avg=200, min=200, max=200
    const result = calculateRouteStepSummary([
      makeSegment(100),
      makeSegment(200),
    ]);
    expect(result.totalAverage).toBe(300);
    expect(result.totalMin).toBe(300);
    expect(result.totalMax).toBe(300);
  });

  it("each segment's doubleAction is evaluated independently", () => {
    // seg1: dist=100, no DA → min=100, max=100
    // seg2: dist=100, DA=0.5 → stepsPerNode=10; min=50, max=100
    const result = calculateRouteStepSummary([
      makeSegment(100, { doubleAction: 0 }),
      makeSegment(100, { doubleAction: 0.5 }),
    ]);
    expect(result.totalMin).toBe(150); // 100 + 50
    expect(result.totalMax).toBe(200); // 100 + 100
  });
});

// ---------------------------------------------------------------------------
// aggregateRouteStats
// ---------------------------------------------------------------------------

describe("aggregateRouteStats", () => {
  it("returns [0,0] ranges for empty segments", () => {
    expect(aggregateRouteStats([])).toEqual({
      weRange: [0, 0],
      daRange: [0, 0],
    });
  });

  it("returns identical min/max for a single segment", () => {
    const result = aggregateRouteStats([
      makeSegment(100, { workEfficiency: 0.4, doubleAction: 0.2 }),
    ]);
    expect(result.weRange).toEqual([0.4, 0.4]);
    expect(result.daRange).toEqual([0.2, 0.2]);
  });

  it("computes correct min and max across multiple segments", () => {
    const result = aggregateRouteStats([
      makeSegment(100, { workEfficiency: 0.1, doubleAction: 0.5 }),
      makeSegment(100, { workEfficiency: 0.6, doubleAction: 0.1 }),
      makeSegment(100, { workEfficiency: 0.3, doubleAction: 0.8 }),
    ]);
    expect(result.weRange).toEqual([0.1, 0.6]);
    expect(result.daRange).toEqual([0.1, 0.8]);
  });
});

// ---------------------------------------------------------------------------
// mapSegmentRequirements
// ---------------------------------------------------------------------------

describe("mapSegmentRequirements", () => {
  const fakeReq = (id: string) =>
    ({
      type: "level",
      id,
    }) as unknown as import("@/domain/types/common").Requirement;

  it("returns empty active arrays for segments with no requirements", () => {
    const segs: SegmentWithRequirements[] = [{ requirements: [], context: {} }];
    const result = mapSegmentRequirements(segs, vi.fn());
    expect(result).toEqual([{ requirements: [], active: [] }]);
  });

  it("calls checkFn once per requirement with the segment context", () => {
    const checkFn = vi.fn().mockReturnValue(true);
    const ctx = { skills: {} };
    const req = fakeReq("agility");
    const segs: SegmentWithRequirements[] = [
      { requirements: [req], context: ctx },
    ];
    mapSegmentRequirements(segs, checkFn);
    expect(checkFn).toHaveBeenCalledWith(req, ctx);
  });

  it("maps check results to active flags", () => {
    const reqA = fakeReq("a");
    const reqB = fakeReq("b");
    const checkFn = vi.fn().mockImplementation((req) => req.id === "a");
    const segs: SegmentWithRequirements[] = [
      { requirements: [reqA, reqB], context: {} },
    ];
    const result = mapSegmentRequirements(segs, checkFn);
    expect(result[0].active).toEqual([true, false]);
  });

  it("handles multiple segments independently", () => {
    const checkFn = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const segs: SegmentWithRequirements[] = [
      { requirements: [fakeReq("x")], context: {} },
      { requirements: [fakeReq("y")], context: {} },
    ];
    const result = mapSegmentRequirements(segs, checkFn);
    expect(result[0].active).toEqual([true]);
    expect(result[1].active).toEqual([false]);
  });
});

// ---------------------------------------------------------------------------
// Work Efficiency effect
// ---------------------------------------------------------------------------

describe("calculateRouteStepSummary — work efficiency", () => {
  it("higher work efficiency reduces stepsPerNode", () => {
    // WE=0: stepsPerNode=10 → max=100
    // WE=1: stepsPerNode = ceil(max(10, 100/2/10)) = ceil(5) = 10 (clamped to 10)
    const noWE = calculateRouteStepSummary([
      makeSegment(100, { workEfficiency: 0 }),
    ]);
    const highWE = calculateRouteStepSummary([
      makeSegment(100, { workEfficiency: 1 }),
    ]);
    expect(highWE.totalMax).toBeLessThanOrEqual(noWE.totalMax);
  });

  it("reduces steps for large distances where clamp does not apply", () => {
    // distance=500, WE=0: stepsPerNode = ceil(500/1/10) = 50 → max=500
    // distance=500, WE=1: stepsPerNode = ceil(500/2/10) = 25 → max=250
    const noWE = calculateRouteStepSummary([
      makeSegment(500, { workEfficiency: 0 }),
    ]);
    const halfWE = calculateRouteStepSummary([
      makeSegment(500, { workEfficiency: 1 }),
    ]);
    expect(halfWE.totalMax).toBe(250);
    expect(noWE.totalMax).toBe(500);
  });
});
