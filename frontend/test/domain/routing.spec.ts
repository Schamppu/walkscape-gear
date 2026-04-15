import { describe, it, expect } from "vitest";
import {
  buildGraph,
  stepsPerNode,
  averageStepsPerRoute,
  pathfind,
} from "@/domain/routing";
import {
  defaultRouteStats,
  makeSimpleBuildSegment,
  makeBuildSegmentWithReq,
} from "../fixtures/routes";
import type { Requirement } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// buildGraph
// ---------------------------------------------------------------------------

describe("buildGraph", () => {
  it("creates a node for every location even with no routes", () => {
    const graph = buildGraph([{ id: "A" }, { id: "B" }], [], {});
    expect(graph.has("A")).toBe(true);
    expect(graph.has("B")).toBe(true);
  });

  it("adds bidirectional edges for each route", () => {
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }],
      [{ locations: ["A", "B"], distance: 100, distanceModifier: 1 }],
      {},
    );
    const aEdges = graph.get("A")!;
    const bEdges = graph.get("B")!;
    expect(aEdges.some((e) => e.to === "B")).toBe(true);
    expect(bEdges.some((e) => e.to === "A")).toBe(true);
  });

  it("floors distance * distanceModifier to an integer", () => {
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }],
      [{ locations: ["A", "B"], distance: 100, distanceModifier: 0.7 }],
      {},
    );
    const edge = graph.get("A")!.find((e) => e.to === "B")!;
    expect(edge.distance).toBe(70);
    expect(Number.isInteger(edge.distance)).toBe(true);
  });

  it("applies distanceModifier consistently to both directions", () => {
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }],
      [{ locations: ["A", "B"], distance: 200, distanceModifier: 1.5 }],
      {},
    );
    const abDist = graph.get("A")!.find((e) => e.to === "B")!.distance;
    const baDist = graph.get("B")!.find((e) => e.to === "A")!.distance;
    expect(abDist).toBe(300);
    expect(baDist).toBe(300);
  });

  it("creates nodes for route locations even if not listed in locations array", () => {
    const graph = buildGraph(
      [],
      [{ locations: ["X", "Y"], distance: 50, distanceModifier: 1 }],
      {},
    );
    expect(graph.has("X")).toBe(true);
    expect(graph.has("Y")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// stepsPerNode
// ---------------------------------------------------------------------------

describe("stepsPerNode", () => {
  it("enforces a minimum of 10 steps regardless of distance or efficiency", () => {
    const stats = defaultRouteStats({ workEfficiency: 999 });
    expect(stepsPerNode(1, stats)).toBe(10);
    expect(stepsPerNode(0, stats)).toBe(10);
  });

  it("computes steps from distance with default stats (distance / 10)", () => {
    // stepsPerNode = ceil(max(10, distance / (1+0) / 10 * 1 + 0))
    expect(stepsPerNode(200, defaultRouteStats())).toBe(20);
    expect(stepsPerNode(1000, defaultRouteStats())).toBe(100);
  });

  it("reduces steps when workEfficiency is positive", () => {
    // we = 1 + 1 = 2 → distance / 2 / 10
    const stats = defaultRouteStats({ workEfficiency: 1 });
    expect(stepsPerNode(1000, stats)).toBe(50);
  });

  it("applies stepsRequiredPercent as a multiplier", () => {
    // stepsPercent = 2 → doubles steps
    const stats = defaultRouteStats({ stepsRequiredPercent: 2 });
    expect(stepsPerNode(500, stats)).toBe(100);
  });

  it("applies negative stepsRequiredPercent as a multiplier", () => {
    // stepsPercent = 0.95 → reduces steps by 5%
    const stats = defaultRouteStats({ stepsRequiredPercent: 0.95 });
    expect(stepsPerNode(1000, stats)).toBe(95);
  });

  it("applies stepsRequiredFlat as an additive offset", () => {
    const stats = defaultRouteStats({ stepsRequiredFlat: -10 });
    // base = 1000/1/10*1 = 100, -10 flat = 90
    expect(stepsPerNode(1000, stats)).toBe(90);
  });

  it("applies both stepsRequiredPercent and stepsRequiredFlat together", () => {
    const stats = defaultRouteStats({
      stepsRequiredPercent: 0.9, // -10%
      stepsRequiredFlat: -20, // -20 steps
    });
    // base = 1000/1/10*1 = 100, -10% = 90, -20 flat = 70
    expect(stepsPerNode(1000, stats)).toBe(70);
  });

  it("cannot reduce steps below 10 with modifiers", () => {
    const stats = defaultRouteStats({
      workEfficiency: 10, // would reduce to 1000/11/10 = ~9.09
      stepsRequiredPercent: 0.5, // would further reduce to ~4.55
      stepsRequiredFlat: -5, // would further reduce to ~-0.45
    });
    expect(stepsPerNode(1000, stats)).toBe(10);
  });

  it("result is always a whole number (ceil applied)", () => {
    const stats = defaultRouteStats();
    // distance=150 → 150/10 = 15 (already whole)
    expect(Number.isInteger(stepsPerNode(150, stats))).toBe(true);
    // distance=105 → 105/10 = 10.5 → ceil = 11
    expect(stepsPerNode(105, stats)).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// averageStepsPerRoute
// ---------------------------------------------------------------------------

describe("averageStepsPerRoute", () => {
  it("is stepsPerNode * 10 when doubleAction is 0", () => {
    const stats = defaultRouteStats();
    expect(averageStepsPerRoute(1000, stats)).toBe(
      Math.ceil(stepsPerNode(1000, stats) * 10),
    );
  });

  it("reduces total steps when doubleAction is positive", () => {
    const noDouble = defaultRouteStats({ doubleAction: 0 });
    const withDouble = defaultRouteStats({ doubleAction: 1 }); // 100% double action
    expect(averageStepsPerRoute(1000, withDouble)).toBeLessThan(
      averageStepsPerRoute(1000, noDouble),
    );
  });

  it("halves expected completions with doubleAction=1", () => {
    // doubleAction=1 → completions = 10/(1+1) = 5 (vs 10 normally)
    const stats = defaultRouteStats({ doubleAction: 1 });
    const base = defaultRouteStats();
    expect(averageStepsPerRoute(1000, stats)).toBe(
      Math.ceil(averageStepsPerRoute(1000, base) / 2),
    );
  });

  it("reduces expected completions with DA", () => {
    const stats = defaultRouteStats({ doubleAction: 0.5 }); // 50% DA → 10/1.5 ≈ 6.67 completions
    const base = defaultRouteStats();
    expect(averageStepsPerRoute(1000, stats)).toBe(
      Math.ceil(averageStepsPerRoute(1000, base) / (10 / 6.67)),
    );
  });
});

// ---------------------------------------------------------------------------
// pathfind
// ---------------------------------------------------------------------------

describe("pathfind", () => {
  const buildSegment = makeSimpleBuildSegment();
  const allMet = (_req: Requirement) => true;
  const noneMet = (_req: Requirement) => false;

  it("returns undefined when start is not in the graph", () => {
    const graph = buildGraph([{ id: "B" }], [], {});
    const result = pathfind(graph, "MISSING", "B", buildSegment, allMet);
    expect(result).toBeUndefined();
  });

  it("returns undefined when goal is not in the graph", () => {
    const graph = buildGraph([{ id: "A" }], [], {});
    const result = pathfind(graph, "A", "MISSING", buildSegment, allMet);
    expect(result).toBeUndefined();
  });

  it("finds a direct path between two connected nodes", () => {
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }],
      [{ locations: ["A", "B"], distance: 1000, distanceModifier: 1 }],
      {},
    );
    const result = pathfind(graph, "A", "B", buildSegment, allMet)!;
    expect(result.best.path).toEqual(["A", "B"]);
    expect(result.bestValid).not.toBeNull();
    expect(result.bestValid!.path).toEqual(["A", "B"]);
  });

  it("finds the shortest path when multiple routes exist", () => {
    // A→B (direct, expensive=10000) vs A→C→B (cheap=300+300=600)
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [
        { locations: ["A", "B"], distance: 10000, distanceModifier: 1 },
        { locations: ["A", "C"], distance: 3000, distanceModifier: 1 },
        { locations: ["C", "B"], distance: 3000, distanceModifier: 1 },
      ],
      {},
    );
    const result = pathfind(graph, "A", "B", buildSegment, allMet)!;
    expect(result.best.path).toEqual(["A", "C", "B"]);
  });

  it("tracks missing requirements without blocking the best path", () => {
    const req: Requirement = {
      type: "locationHasKeywords",
      name: null,
      opposite: false,
      requirement: { keywords: ["forest"] },
    };
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }],
      [{ locations: ["A", "B"], distance: 1000, distanceModifier: 1 }],
      {},
    );
    const result = pathfind(
      graph,
      "A",
      "B",
      makeBuildSegmentWithReq(req),
      noneMet,
    )!;
    expect(result.best.path).toEqual(["A", "B"]);
    expect(result.best.missing).toHaveLength(1);
    expect(result.bestValid).toBeNull();
  });

  it("sets bestValid to null when no requirement-free path exists", () => {
    const req: Requirement = {
      type: "locationHasKeywords",
      name: null,
      opposite: false,
      requirement: { keywords: ["cave"] },
    };
    const graph = buildGraph(
      [{ id: "A" }, { id: "B" }],
      [{ locations: ["A", "B"], distance: 1000, distanceModifier: 1 }],
      {},
    );
    const result = pathfind(
      graph,
      "A",
      "B",
      makeBuildSegmentWithReq(req),
      noneMet,
    )!;
    expect(result.bestValid).toBeNull();
  });

  it("returns an empty path when goal is unreachable (disconnected graph)", () => {
    const graph = buildGraph([{ id: "A" }, { id: "B" }], [], {});
    const result = pathfind(graph, "A", "B", buildSegment, allMet)!;
    expect(result.best.path).toEqual([]);
    expect(result.bestValid).toBeNull();
  });
});
