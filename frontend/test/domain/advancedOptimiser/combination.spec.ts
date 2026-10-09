import { describe, it, expect } from "vitest";
import {
  COMBINATION_STRATEGIES,
  overallImprovement,
  weightedSum,
} from "@/domain/advancedOptimiser/combination";
import { makeTarget } from "../../fixtures/advancedOptimiser";

describe("weightedSum", () => {
  it("returns Σ weight × normalised value", () => {
    expect(
      weightedSum([
        { target: makeTarget("xp", "step", 10), normalised: 1.2 },
        { target: makeTarget("rewardRolls", "step", 5), normalised: 2 },
      ]),
    ).toBeCloseTo(22, 10);
  });

  it("skips weight-0 and unscored targets", () => {
    expect(
      weightedSum([
        { target: makeTarget("xp", "step", 0), normalised: 100 },
        { target: makeTarget("chests", "step", 10), normalised: null },
        { target: makeTarget("rewardRolls", "step", 2), normalised: 1.5 },
      ]),
    ).toBe(3);
  });

  it("returns 0 when nothing contributes", () => {
    expect(weightedSum([])).toBe(0);
    expect(weightedSum([{ target: makeTarget("xp", "step", 0), normalised: 1 }])).toBe(0);
  });
});

describe("COMBINATION_STRATEGIES", () => {
  it("maps weightedSum to its strategy", () => {
    expect(COMBINATION_STRATEGIES.weightedSum).toBe(weightedSum);
  });
});

describe("overallImprovement", () => {
  it("is the weighted mean ratio minus 1", () => {
    const targets = [makeTarget("xp", "step", 3), makeTarget("rewardRolls", "step", 1)];
    expect(overallImprovement(targets, { "xp/step": 1.4, "rewardRolls/step": 1 })).toBeCloseTo(0.3, 10);
  });

  it("is 0 for naked gear", () => {
    expect(overallImprovement([makeTarget("xp", "step", 5)], { "xp/step": 1 })).toBe(0);
  });

  it("leaves out targets without a baseline or weight", () => {
    const targets = [makeTarget("xp", "step", 1), makeTarget("chests", "step", 9), makeTarget("tokens", "step", 0)];
    expect(
      overallImprovement(targets, { "xp/step": 1.5, "chests/step": null, "tokens/step": 9 }),
    ).toBeCloseTo(0.5, 10);
  });

  it("returns 0 when nothing can be compared", () => {
    expect(overallImprovement([makeTarget("chests", "step", 1)], { "chests/step": null })).toBe(0);
  });
});
