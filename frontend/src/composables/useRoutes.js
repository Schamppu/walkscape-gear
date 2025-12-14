import { ref, computed } from "vue";
import { useRouteStore } from "@/store/route";
import { usePlayerStore } from "@/store/player";
import { useRequirements } from "@/composables/useRequirements";
import { useEffectiveAttrs } from "@/composables/useEffectiveAttrs";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { argbToRgba } from "@/utils/argbToRgba";

export function useRoutes(baseContext) {
  const routeStore = useRouteStore();
  const playerStore = usePlayerStore();
  const { checkRequirements } = useRequirements(baseContext);
  const { totalsByStatWithContext } = useEffectiveAttrs(baseContext);

  const graph = ref(new Map());

  function addLocation(name) {
    if (!graph.value.has(name)) {
      graph.value.set(name, []);
    }
  }

  function addRoute(from, to, distance, requirements = null) {
    if (!graph.value.has(from)) addLocation(from);
    if (!graph.value.has(to)) addLocation(to);

    graph.value.get(from).push({
      to,
      distance,
      requirements,
    });
  }

  const getTerrainModifier = (from, routeOptions) => {
    return routeOptions
      .filter(({ options }) => options[from])
      .map(({ terrainModifiers }) =>
        terrainModifiers.map((tm) => routeStore.terrainModifiersMap[tm])
      );
  };

  const getRouteContext = (from, route) => {
    return {
      ...baseContext,
      location: computed(() => {
        return {
          faction: from.faction,
          subFactions: from.subFactions,
          keywords: from.keywords,
        };
      }),
      terrainModifiers: computed(() => route.requirements),
    };
  };

  const getLocationInfo = (id) => {
    const data = routeStore.locationsMap[id];
    const color = argbToRgba(playerStore.factionsMap[data.faction].color);
    return { id, ...data, color };
  };

  const getSegment = (fromId, route) => {
    const from = getLocationInfo(fromId);
    const to = getLocationInfo(route.to);
    const ctx = getRouteContext(from, route);

    const statTotals = totalsByStatWithContext(ctx);
    const skillModifiers = useSkillModifiers(ctx, statTotals);
    const stats = {
      maxWorkEfficiency: skillModifiers.maxWorkEfficiency.value,
      workEfficiency: skillModifiers.workEfficiency.value,
      uncappedWorkEfficiency: skillModifiers.uncappedWorkEfficiency.value,
      effectiveMaxWorkEfficiency:
        skillModifiers.effectiveMaxWorkEfficiency.value,
      doubleAction: skillModifiers.doubleAction.value,
      stepsRequiredPercent: skillModifiers.stepsRequiredPercent.value,
      stepsRequiredFlat: skillModifiers.stepsRequiredFlat.value,
    };

    return {
      from,
      to,
      stats,
      route,
      context: ctx,
      distance: route.distance,
      terrainModifiers: ctx.terrainModifiers.value,
      requirements: ctx.terrainModifiers.value.flatMap((tm) =>
        tm.flatMap(({ requirements }) => requirements)
      ),
    };
  };

  routeStore.locations.forEach(({ id }) => addLocation(id));
  routeStore.routes.forEach((route) => {
    const { locations, options, distance, distanceModifier } = route;
    const [from, to] = locations;
    const dist = Math.floor(distance * distanceModifier);

    addRoute(from, to, dist, getTerrainModifier(from, options || []));
    addRoute(to, from, dist, getTerrainModifier(to, options || []));
  });

  const getRoute = (start, goal) => {
    if (!graph.value.has(start)) {
      console.warn(`${start} not in map`);
      return;
    }
    if (!graph.value.has(goal)) {
      console.warn(`${goal} not in map`);
      return;
    }

    const distances = new Map();
    const prev = new Map();
    const queue = new Set();
    const segmentMap = new Map();

    for (const id of graph.value.keys()) {
      distances.set(id, Infinity);
      prev.set(id, null);
      queue.add(id);
    }
    distances.set(start, 0);

    while (queue.size) {
      // find node with smallest distance
      const current = [...queue].reduce((a, b) =>
        distances.get(a) < distances.get(b) ? a : b
      );

      queue.delete(current);
      if (current === goal) break;

      for (const edge of graph.value.get(current) || []) {
        const segment = getSegment(current, edge);
        if (!checkRequirements(segment.requirements, segment.context)) continue;

        const alt =
          distances.get(current) +
          averageStepsPerRoute(edge.distance, segment.stats);
        if (alt < distances.get(edge.to)) {
          distances.set(edge.to, alt);
          prev.set(edge.to, current);
          segmentMap.set(edge.to, segment);
        }
      }
    }

    if (distances.get(goal) === Infinity) return null;

    // reconstruct path
    const segments = [];
    const path = [];
    let u = goal;
    while (u) {
      const temp = u;
      u = prev.get(u);
      const segment = segmentMap.get(temp);
      if (segment) segments.unshift(segment);
      path.unshift(temp);
    }
    routeStore.setSegments(segments);
    return { path, segments };
  };

  const stepsPerNode = (distance, stats) => {
    const we = 1 + stats.workEfficiency;
    return Math.ceil(
      Math.max(
        10,
        (distance / we / 10) * stats.stepsRequiredPercent +
          stats.stepsRequiredFlat
      )
    );
  };

  // Calculate expected number of node completions with double action
  const expectedNodeCompletions = (stats) => 10 / (1 + stats.doubleAction);

  // Calculate average steps for a single route
  const averageStepsPerRoute = (distance, stats) => {
    const stepsPerSingleNode = stepsPerNode(distance, stats);
    return Math.ceil(stepsPerSingleNode * expectedNodeCompletions(stats));
  };

  return {
    getRoute,
    stepsPerNode,
    averageStepsPerRoute,
  };
}
