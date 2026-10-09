import { describe, it, expect } from "vitest";
import {
  BEST_FOR_SKILL_STORAGE_KEY,
  configStorageKey,
  defaultConfig,
  parseConfig,
} from "@/domain/advancedOptimiser/config";
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

describe("configStorageKey", () => {
  it("keys single-activity configs by activity id", () => {
    expect(configStorageKey(defaultConfig("act_1"))).toBe("advancedOptimiser.config.act_1");
  });

  it("shares one key for all best-for-skill configs", () => {
    const config = { ...defaultConfig("x"), mode: { kind: "bestForSkill" as const, skillId: "fishing" as const } };
    expect(configStorageKey(config)).toBe(BEST_FOR_SKILL_STORAGE_KEY);
  });
});

describe("parseConfig", () => {
  it("round-trips a config through JSON", () => {
    const config = { ...defaultConfig("act_1"), targets: [{ x: "chests", y: "action", weight: 4 }] };
    expect(parseConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
  });

  it("round-trips a best-for-skill config", () => {
    const config = { ...defaultConfig("x"), mode: { kind: "bestForSkill" as const, skillId: "mining" as const } };
    expect(parseConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
  });

  it.each([null, "text", 5, {}, { mode: { kind: "other" }, targets: [] }, { mode: { kind: "singleActivity", activityId: "a" } }])(
    "rejects %o",
    (raw) => {
      expect(parseConfig(raw)).toBeNull();
    },
  );

  it("drops unknown and duplicate targets and clamps weights", () => {
    const parsed = parseConfig({
      mode: { kind: "singleActivity", activityId: "a" },
      targets: [
        { x: "xp", y: "step", weight: 12.4 },
        { x: "xp", y: "step", weight: 3 },
        { x: "gold", y: "step", weight: 3 },
        { x: "chests", y: "action", weight: -2 },
        { x: "tokens", y: "step" },
      ],
    });
    expect(parsed?.targets).toEqual([
      { x: "xp", y: "step", weight: 10 },
      { x: "chests", y: "action", weight: 0 },
    ]);
  });
});
