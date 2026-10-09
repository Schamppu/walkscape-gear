import { describe, it, expect } from "vitest";
import { defaultConfig } from "@/domain/advancedOptimiser/config";
import { isTargetValid } from "@/domain/advancedOptimiser/targets";
import { makeTargetContext } from "../../fixtures/advancedOptimiser";

describe("defaultConfig", () => {
  it("is a single-activity weighted-sum config for the given id", () => {
    const config = defaultConfig("act_1");
    expect(config.mode).toEqual({ kind: "singleActivity", activityId: "act_1" });
    expect(config.combinationRule).toBe("weightedSum");
    expect(config.targets.length).toBeGreaterThan(0);
  });

  it.each([
    ["plain activity", makeTargetContext()],
    ["plain recipe", makeTargetContext({ isRecipe: true })],
    ["crafted recipe", makeTargetContext({ isRecipe: true, producesCraftedItem: true })],
  ])("only contains valid targets for a %s", (_, ctx) => {
    for (const target of defaultConfig("id").targets) {
      expect(isTargetValid(target, ctx)).toBe(true);
    }
  });

  it("returns a fresh object each call", () => {
    expect(defaultConfig("id").targets).not.toBe(defaultConfig("id").targets);
  });
});
