import { ref, computed } from "vue";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import { useRouteStore } from "@/store/route";
import { usePlayerStore } from "@/store/player";
import { useRequirements } from "@/composables/useRequirements";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { argbToRgba } from "@/utils/argbToRgba.ts";

export function useRoutes(baseContext) {
  const routeStore = useRouteStore();
  const playerStore = usePlayerStore();
  const { checkRequirement } = useRequirements(baseContext);

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

    const skillModifiers = useSkillModifiers(ctx);
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

  function isBetter(a, b) {
    if (a.missing.length !== b.missing.length)
      return a.missing.length < b.missing.length;
    return a.distance < b.distance;
  }

  const pathfind = (start, goal) => {
    if (!graph.value.has(start)) {
      console.warn(`${start} not in map`);
      return;
    }
    if (!graph.value.has(goal)) {
      console.warn(`${goal} not in map`);
      return;
    }

    const pq = new MinPriorityQueue(({ distance }) => distance);
    const bestValid = new Map();
    const best = new Map();

    const startCandidate = {
      location: start,
      distance: 0,
      missing: [],
      prev: null,
      segments: null,
    };
    bestValid.set(start, startCandidate);
    best.set(start, startCandidate);

    pq.enqueue(startCandidate);

    while (!pq.isEmpty()) {
      const current = pq.dequeue();
      if (current.location === goal && !current.missing.length) break;

      for (const edge of graph.value.get(current.location) || []) {
        const segment = getSegment(current.location, edge);
        const unmetReqs = segment.requirements.filter(
          (req) => !checkRequirement(req, segment.context)
        );

        const candidate = {
          location: edge.to,
          distance:
            current.distance +
            averageStepsPerRoute(edge.distance, segment.stats),
          missing: [...current.missing, ...unmetReqs],
          prev: current.location,
          segment,
        };

        if (
          !best.get(edge.to) ||
          candidate.distance < best.get(edge.to).distance
        ) {
          best.set(edge.to, candidate);
          pq.enqueue(candidate);
        }
        if (
          !candidate.missing.length &&
          (!bestValid.get(edge.to) ||
            isBetter(candidate, bestValid.get(edge.to)))
        ) {
          bestValid.set(edge.to, candidate);
          pq.enqueue(candidate);
        }
      }
    }

    const constructPath = (map) => {
      const segments = [];
      const path = [];
      const missing = [];
      let u = map.get(goal);
      while (u) {
        if (u.segment) segments.unshift(u.segment);
        if (u.missing) missing.push(...u.missing);
        path.unshift(u.location);
        u = map.get(u.prev);
      }
      return { path, segments, missing };
    };

    const bestRoute = constructPath(best);
    const bestValidRoute = bestValid.get(goal)
      ? constructPath(bestValid)
      : null;
    return { best: bestRoute, bestValid: bestValidRoute };
  };

  const getRoute = (start, goal) => {
    const route = pathfind(start, goal);
    const segments = route.bestValid
      ? route.bestValid.segments
      : route.best.segments;
    routeStore.setSegments(segments);
    return route;
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
