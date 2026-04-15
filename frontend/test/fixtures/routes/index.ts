import type { RouteSegmentStats } from "@/domain/types/route";
import type { GraphEdge } from "@/domain/routing";
import type { Requirement } from "@/domain/types/common";

export type SimpleSegment = {
  requirements: Requirement[];
  stats: RouteSegmentStats;
};

/** Default stats with no bonuses applied. */
export function defaultRouteStats(overrides: Partial<RouteSegmentStats> = {}): RouteSegmentStats {
  return {
    maxWorkEfficiency: 1,
    workEfficiency: 0,
    uncappedWorkEfficiency: 1,
    effectiveMaxWorkEfficiency: 1,
    doubleAction: 0,
    stepsRequiredPercent: 1,
    stepsRequiredFlat: 0,
    ...overrides,
  };
}

/** A buildSegment callback that returns no requirements and default stats. */
export function makeSimpleBuildSegment(
  statsOverrides: Partial<RouteSegmentStats> = {},
) {
  return (_from: string, _edge: GraphEdge): SimpleSegment => ({
    requirements: [],
    stats: defaultRouteStats(statsOverrides),
  });
}

/** A buildSegment callback that attaches a requirement to every segment. */
export function makeBuildSegmentWithReq(req: Requirement) {
  return (_from: string, _edge: GraphEdge): SimpleSegment => ({
    requirements: [req],
    stats: defaultRouteStats(),
  });
}
