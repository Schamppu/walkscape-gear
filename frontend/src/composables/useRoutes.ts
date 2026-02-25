import { computed, type ComputedRef } from "vue";
import { useRouteStore, type LocationInfo, type RouteSegment } from "@/store/route";
import { usePlayerStore } from "@/store/player";
import { useRequirements, type RequirementContext } from "@/composables/useRequirements";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { argbToRgba } from "@/utils/argbToRgba";
import {
  buildGraph,
  pathfind,
  stepsPerNode,
  averageStepsPerRoute,
  type GraphEdge,
  type PathfindResult,
  type RouteSegmentStats,
} from "@/domain/routing";

export type { PathfindResult, RouteSegmentStats };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouteContext = SkillModifiersContext & {
  terrainModifiers: ComputedRef<RouteSegment["terrainModifiers"]>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useRoutes(baseContext: SkillModifiersContext): {
  getRoute: (start: string, goal: string) => PathfindResult<RouteSegment> | undefined;
  stepsPerNode: (distance: number, stats: RouteSegmentStats) => number;
  averageStepsPerRoute: (distance: number, stats: RouteSegmentStats) => number;
} {
  const routeStore = useRouteStore();
  const playerStore = usePlayerStore();
  const { checkRequirement } = useRequirements(baseContext as RequirementContext);

  const graph = buildGraph(
    routeStore.locations,
    routeStore.routes,
    routeStore.terrainModifiersMap,
  );

  const getLocationInfo = (id: string): LocationInfo => {
    const data = routeStore.locationsMap[id];
    const color = argbToRgba(playerStore.factionsMap[data.faction].color);
    return { id, ...data, color };
  };

  const getRouteContext = (from: LocationInfo, route: GraphEdge): RouteContext => {
    return {
      ...baseContext,
      location: computed(() => ({
        faction: from.faction,
        subFactions: from.subFactions,
        keywords: from.keywords,
      })),
      terrainModifiers: computed(() => route.requirements),
    } as unknown as RouteContext;
  };

  const buildSegment = (fromId: string, edge: GraphEdge): RouteSegment => {
    const from = getLocationInfo(fromId);
    const to = getLocationInfo(edge.to);
    const ctx = getRouteContext(from, edge);

    const skillModifiers = useSkillModifiers(ctx);
    const stats: RouteSegmentStats = {
      maxWorkEfficiency: skillModifiers.maxWorkEfficiency.value,
      workEfficiency: skillModifiers.workEfficiency.value,
      uncappedWorkEfficiency: skillModifiers.uncappedWorkEfficiency.value,
      effectiveMaxWorkEfficiency: skillModifiers.effectiveMaxWorkEfficiency.value,
      doubleAction: skillModifiers.doubleAction.value,
      stepsRequiredPercent: skillModifiers.stepsRequiredPercent.value,
      stepsRequiredFlat: skillModifiers.stepsRequiredFlat.value,
    };

    return {
      from,
      to,
      stats,
      route: edge,
      context: ctx,
      distance: edge.distance,
      terrainModifiers: ctx.terrainModifiers.value,
      requirements: ctx.terrainModifiers.value.flatMap((tm) =>
        tm.flatMap(({ requirements }) => requirements),
      ),
    };
  };

  const getRoute = (
    start: string,
    goal: string,
  ): PathfindResult<RouteSegment> | undefined => {
    const result = pathfind(
      graph,
      start,
      goal,
      buildSegment,
      (req) => checkRequirement(req, baseContext as RequirementContext),
    );
    if (!result) return undefined;

    const segments = result.bestValid
      ? result.bestValid.segments
      : result.best.segments;
    routeStore.setSegments(segments);
    return result;
  };

  return {
    getRoute,
    stepsPerNode,
    averageStepsPerRoute,
  };
}

