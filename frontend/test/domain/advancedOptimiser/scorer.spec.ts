import { describe, it, expect } from "vitest";
import { applyLocks, compareSetScores, createSetScorer } from "@/domain/advancedOptimiser/scorer";
import type { HandledRequirement } from "@/domain/optimiser/requirements";
import {
  keywordEquippedReq,
  makeAttrEntry,
  makeJob,
  makeLocationSummary,
  makeTarget,
  makeWorkerItem,
  realmReq,
  setBonusReq,
} from "../../fixtures/advancedOptimiser";

// Fixture activity: 100 work, WE capped at ×2, 50 XP → naked xp/step = 0.5.

const weItem = (id: string, value: number) =>
  makeWorkerItem(id, [{ type: "workEfficiency", value }]);

describe("createSetScorer", () => {
  it("scores naked gear as the sum of weights (every target = baseline)", () => {
    const score = createSetScorer(
      makeJob({ targets: [makeTarget("xp", "step", 3), makeTarget("rewardRolls", "step", 2)] }),
    );
    const result = score({});
    expect(result.valid).toBe(true);
    expect(result.score).toBeCloseTo(5, 10);
    expect(result.values["xp/step"]).toBeCloseTo(0.5, 10);
  });

  it("rewards work efficiency on a per-step target", () => {
    const score = createSetScorer(makeJob());
    // +100% WE → 50 steps → xp/step 1.0 → twice the baseline.
    expect(score({ head: weItem("hat", 1) }).score).toBeCloseTo(2, 10);
  });

  it("counts locked items", () => {
    const score = createSetScorer(makeJob());
    const seed = applyLocks({ head: weItem("hat", 1) });
    expect(score(seed).score).toBeCloseTo(2, 10);
  });

  it("only applies a set bonus with enough pieces", () => {
    const piece = (id: string) =>
      makeWorkerItem(id, [], {
        keywords: ["treasure"],
        conditional: [
          { stats: [{ type: "workEfficiency", value: 0.5 }], requirements: [setBonusReq("treasure", 3)] },
        ],
      });
    const score = createSetScorer(makeJob());
    const two = { head: piece("a"), chest: piece("b") };
    const three = { ...two, legs: piece("c") };
    expect(score(two).score).toBeCloseTo(1, 10);
    expect(score(three).score).toBeGreaterThan(1);
  });

  it("only counts realm-only stats at a location in that realm", () => {
    const deepItem = makeWorkerItem("deep_hat", [], {
      conditional: [
        { stats: [{ type: "workEfficiency", value: 1 }], requirements: [realmReq("syrenthia")] },
      ],
    });
    const score = createSetScorer(makeJob());
    const syrenthia = makeLocationSummary("reef", "syrenthia");
    const jarvonia = makeLocationSummary("town", "jarvonia");
    expect(score({ head: deepItem, location: syrenthia }).score).toBeCloseTo(2, 10);
    expect(score({ head: deepItem, location: jarvonia }).score).toBeCloseTo(1, 10);
  });

  it("normalises against each location's own naked baseline", () => {
    // A collectible that only works in Syrenthia raises naked gear there.
    const job = makeJob({
      staticEntries: [
        makeAttrEntry("deep_collectible", [{ type: "workEfficiency", value: 1 }], [
          realmReq("syrenthia"),
        ]),
      ],
    });
    const score = createSetScorer(job);
    const syrenthia = makeLocationSummary("reef", "syrenthia");
    const jarvonia = makeLocationSummary("town", "jarvonia");

    const nakedSyrenthia = score({ location: syrenthia });
    expect(nakedSyrenthia.values["xp/step"]).toBeCloseTo(1, 10);
    expect(nakedSyrenthia.score).toBeCloseTo(1, 10);
    expect(score({ location: jarvonia }).score).toBeCloseTo(1, 10);
  });

  it("marks sets missing a required keyword invalid but still scores them", () => {
    const job = makeJob({
      activityRequirements: [keywordEquippedReq("fishing_rod") as HandledRequirement],
    });
    const score = createSetScorer(job);
    const rod = makeWorkerItem("rod", [], { keywords: ["fishing_rod"] });

    const without = score({ head: weItem("hat", 1) });
    expect(without.valid).toBe(false);
    expect(without.score).toBeCloseTo(2, 10);
    expect(score({ tool1: rod }).valid).toBe(true);
  });
});

describe("compareSetScores", () => {
  it("puts valid sets first, then higher scores", () => {
    const sorted = [
      { valid: false, score: 10, values: {} },
      { valid: true, score: 1, values: {} },
      { valid: true, score: 2, values: {} },
    ].sort(compareSetScores);
    expect(sorted.map((s) => s.score)).toEqual([2, 1, 10]);
  });
});
