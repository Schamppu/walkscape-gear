import { describe, it, expect } from "vitest";
import { QUICK_SEARCH_SETTINGS, quickSetTargets } from "@/domain/advancedOptimiser/quickSet";
import {
  activityOptimiserPriorities,
  qoRecipeOptimiserPriorities,
  recipeOptimiserPriorities,
} from "@/constants/settings/optimiserPriorities";
import { DEFAULT_SEARCH_SETTINGS } from "@/domain/advancedOptimiser/search";

describe("quickSetTargets", () => {
  it.each([
    ...activityOptimiserPriorities,
    ...recipeOptimiserPriorities,
    ...qoRecipeOptimiserPriorities,
  ].map((p) => p.value))("maps the %s priority to weighted targets", (priority) => {
    const targets = quickSetTargets(priority);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((t) => t.weight > 0)).toBe(true);
  });

  it.each([
    ["stepsPerRewardRoll", [{ x: "rewardRolls", y: "step", weight: 1 }]],
    ["xpPerStep", [{ x: "xp", y: "step", weight: 1 }]],
    ["stepsPerFineRoll", [{ x: "fineMaterials", y: "step", weight: 1 }]],
    ["stepsPerCollectibleRoll", [{ x: "collectibles", y: "step", weight: 1 }]],
    ["craftsPerMaterial", [{ x: "rewardRolls", y: "material", weight: 1 }]],
    ["averageEternalCrafts", [{ x: "eternalCrafts", y: "material", weight: 1 }]],
  ])("maps %s", (priority, expected) => {
    expect(quickSetTargets(priority)).toEqual(expected);
  });

  it("weights balanced 2:1 between reward rolls and XP", () => {
    expect(quickSetTargets("balanced")).toEqual([
      { x: "rewardRolls", y: "step", weight: 2 },
      { x: "xp", y: "step", weight: 1 },
    ]);
    expect(quickSetTargets("balancedRecipe")).toEqual([
      { x: "rewardRolls", y: "material", weight: 2 },
      { x: "xp", y: "step", weight: 1 },
    ]);
  });

  it("falls back to reward rolls per step for unknown priorities", () => {
    expect(quickSetTargets("unknown")).toEqual(quickSetTargets("stepsPerRewardRoll"));
  });

  it("returns fresh target objects", () => {
    expect(quickSetTargets("balanced")[0]).not.toBe(quickSetTargets("balanced")[0]);
  });
});

describe("QUICK_SEARCH_SETTINGS", () => {
  it("is a shorter search than the default", () => {
    expect(QUICK_SEARCH_SETTINGS.timeBudgetMs).toBeLessThan(DEFAULT_SEARCH_SETTINGS.timeBudgetMs);
    expect(QUICK_SEARCH_SETTINGS.beamWidth).toBeLessThan(DEFAULT_SEARCH_SETTINGS.beamWidth);
    expect(QUICK_SEARCH_SETTINGS.setMoves).toBe(false);
    expect(QUICK_SEARCH_SETTINGS.pairSamples).toBe(0);
  });
});
