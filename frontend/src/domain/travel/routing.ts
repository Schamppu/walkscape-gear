/**
 * Purpose:
 * Pure functions for graph-based route pathfinding and step calculations.
 *
 * Responsibilities:
 * - Build a weighted directed graph from location and route data.
 * - Run a priority-queue shortest-path search over that graph.
 * - Calculate per-node and per-route step costs from stat modifiers.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Read reactive state.
 * - Contain any side effects.
 * - Mutate inputs.
 */

import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import type { TerrainModifier } from "@/domain/types/terrain";
import type { RouteOption, RouteSegmentStats } from "@/domain/types/route";
import type { Requirement } from "@/domain/types/common";

export type { RouteSegmentStats };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphEdge = {
  to: string;
  distance: number;
  requirements: TerrainModifier[][];
};

/** A location id paired with its outbound edges. */
export type LocationGraph = Map<string, GraphEdge[]>;

type PathNode<TSegment> = {
  location: string;
  distance: number;
  missing: Requirement[];
  prev: string | null;
  segment?: TSegment;
};

export type PathResult<TSegment> = {
  path: string[];
  segments: TSegment[];
  missing: Requirement[];
};

export type PathfindResult<TSegment> = {
  best: PathResult<TSegment>;
  bestValid: PathResult<TSegment> | null;
};

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

/**
 * Resolves the terrain modifiers that apply when leaving `from` given a set
 * of route options and a pre-loaded terrain modifier map.
 */
export function resolveTerrainModifiers(
  from: string,
  routeOptions: RouteOption[],
  terrainModifiersMap: Record<string, Omit<TerrainModifier, "id">>,
): TerrainModifier[][] {
  return routeOptions
    .filter(({ options }) => options[from])
    .map(({ terrainModifiers }) =>
      terrainModifiers.map((id) => ({ id, ...terrainModifiersMap[id] })),
    );
}

/**
 * Builds a bidirectional weighted directed graph from raw location and route
 * data. Returns a `Map` keyed by location id.
 */
export function buildGraph(
  locations: { id: string }[],
  routes: {
    locations: string[];
    distance: number;
    options?: RouteOption[];
  }[],
  terrainModifiersMap: Record<string, Omit<TerrainModifier, "id">>,
): LocationGraph {
  const graph: LocationGraph = new Map();

  const ensureLocation = (id: string): void => {
    if (!graph.has(id)) graph.set(id, []);
  };

  const addEdge = (
    from: string,
    to: string,
    distance: number,
    requirements: TerrainModifier[][],
  ): void => {
    ensureLocation(from);
    ensureLocation(to);
    graph.get(from)!.push({ to, distance, requirements });
  };

  for (const { id } of locations) ensureLocation(id);

  for (const { locations: locs, distance, options } of routes) {
    const [from, to] = locs;
    const dist = distance;
    const opts = options ?? [];
    addEdge(from, to, dist, resolveTerrainModifiers(from, opts, terrainModifiersMap));
    addEdge(to, from, dist, resolveTerrainModifiers(to, opts, terrainModifiersMap));
  }

  return graph;
}

// ---------------------------------------------------------------------------
// Step calculations
// ---------------------------------------------------------------------------

/**
 * Number of steps to complete a single route node given effective stats.
 * Mirrors the in-game formula: ceil((distance / WE / 10) * stepsPercent + stepsFlat),
 * with a minimum of 10 steps.
 */
export function stepsPerNode(distance: number, stats: RouteSegmentStats): number {
  const we = 1 + stats.workEfficiency;
  return Math.ceil(
    Math.max(
      10,
      (distance / we / 10) * stats.stepsRequiredPercent + stats.stepsRequiredFlat,
    ),
  );
}

/**
 * Expected number of node completions per action, accounting for double action.
 * (10 nodes are required per segment; double action reduces average steps.)
 */
export function expectedNodeCompletions(stats: RouteSegmentStats): number {
  return 10 / (1 + stats.doubleAction);
}

/**
 * Average steps to traverse a full route segment of the given distance,
 * accounting for double action.
 */
export function averageStepsPerRoute(distance: number, stats: RouteSegmentStats): number {
  return Math.ceil(stepsPerNode(distance, stats) * expectedNodeCompletions(stats));
}

// ---------------------------------------------------------------------------
// Pathfinding
// ---------------------------------------------------------------------------

function isBetter<TSegment>(
  a: PathNode<TSegment>,
  b: PathNode<TSegment>,
): boolean {
  if (a.missing.length !== b.missing.length) return a.missing.length < b.missing.length;
  return a.distance < b.distance;
}

/**
 * Runs a priority-queue shortest-path search from `start` to `goal` over
 * `graph`.
 *
 * Two independent solutions are tracked simultaneously:
 * - `best`      — lowest total distance, requirements ignored.
 * - `bestValid` — lowest total distance among paths with all requirements met.
 *
 * @param graph           Pre-built location graph.
 * @param start           Starting location id.
 * @param goal            Target location id.
 * @param buildSegment    Converts a `(fromId, edge)` pair into a typed segment
 *                        value; called once per edge during traversal.
 * @param isRequirementMet Returns true when a single `Requirement` is satisfied
 *                        by the current character context.
 */
export function pathfind<TSegment extends { requirements: Requirement[]; stats: RouteSegmentStats }>(
  graph: LocationGraph,
  start: string,
  goal: string,
  buildSegment: (fromId: string, edge: GraphEdge) => TSegment,
  isRequirementMet: (req: Requirement) => boolean,
): PathfindResult<TSegment> | undefined {
  if (!graph.has(start)) {
    console.warn(`${start} not in map`);
    return undefined;
  }
  if (!graph.has(goal)) {
    console.warn(`${goal} not in map`);
    return undefined;
  }

  const pq = new MinPriorityQueue<PathNode<TSegment>>(({ distance }) => distance);
  const bestValid = new Map<string, PathNode<TSegment>>();
  const best = new Map<string, PathNode<TSegment>>();

  const startNode: PathNode<TSegment> = {
    location: start,
    distance: 0,
    missing: [],
    prev: null,
  };
  bestValid.set(start, startNode);
  best.set(start, startNode);
  pq.enqueue(startNode);

  while (!pq.isEmpty()) {
    const current = pq.dequeue()!;
    if (current.location === goal && !current.missing.length) break;

    for (const edge of graph.get(current.location) ?? []) {
      const segment = buildSegment(current.location, edge);
      const unmetReqs = segment.requirements.filter((req) => !isRequirementMet(req));

      const candidate: PathNode<TSegment> = {
        location: edge.to,
        distance: current.distance + averageStepsPerRoute(edge.distance, segment.stats),
        missing: [...current.missing, ...unmetReqs],
        prev: current.location,
        segment,
      };

      if (!best.get(edge.to) || candidate.distance < best.get(edge.to)!.distance) {
        best.set(edge.to, candidate);
        pq.enqueue(candidate);
      }

      if (
        !candidate.missing.length &&
        (!bestValid.get(edge.to) || isBetter(candidate, bestValid.get(edge.to)!))
      ) {
        bestValid.set(edge.to, candidate);
        pq.enqueue(candidate);
      }
    }
  }

  const constructPath = (map: Map<string, PathNode<TSegment>>): PathResult<TSegment> => {
    const segments: TSegment[] = [];
    const path: string[] = [];
    const missing: Requirement[] = [];
    let u: PathNode<TSegment> | undefined = map.get(goal);
    while (u) {
      if (u.segment) segments.unshift(u.segment);
      if (u.missing) missing.push(...u.missing);
      path.unshift(u.location);
      u = u.prev !== null ? map.get(u.prev) : undefined;
    }
    return { path, segments, missing };
  };

  return {
    best: constructPath(best),
    bestValid: bestValid.get(goal) ? constructPath(bestValid) : null,
  };
}
