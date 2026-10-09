import { describe, it, expect } from "vitest";
import { COMBINATION_STRATEGIES, weightedSum } from "@/domain/advancedOptimiser/combination";
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
