import type { components } from "./generated/api";

export type RouteSummary = components["schemas"]["RouteListItem"];

export type RouteOption = NonNullable<RouteSummary["options"]>[number];

/** Effective travel stats for a route segment, computed on the frontend. */
export type RouteSegmentStats = {
  maxWorkEfficiency: number;
  workEfficiency: number;
  uncappedWorkEfficiency: number;
  effectiveMaxWorkEfficiency: number;
  doubleAction: number;
  stepsRequiredPercent: number;
  stepsRequiredFlat: number;
};
