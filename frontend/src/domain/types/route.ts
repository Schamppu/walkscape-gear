export type RouteOption = {
  options: Record<string, boolean>;
  terrainModifiers: string[];
};

export type RouteSegmentStats = {
  maxWorkEfficiency: number;
  workEfficiency: number;
  uncappedWorkEfficiency: number;
  effectiveMaxWorkEfficiency: number;
  doubleAction: number;
  stepsRequiredPercent: number;
  stepsRequiredFlat: number;
};

export type RouteSummary = {
  id: string;
  name: string;
  locations: string[];
  distance: number;
  distanceModifier: number;
  options?: RouteOption[];
};
