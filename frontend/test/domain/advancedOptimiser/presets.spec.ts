import { describe, it, expect } from "vitest";
import {
  BUILTIN_PRESETS,
  builtinPresetSlug,
  configFromPreset,
  isPresetApplicable,
  pickDefaultPreset,
  targetsEqual,
  userPresetDbId,
  userPresetId,
  type OptimiserPreset,
} from "@/domain/advancedOptimiser/presets";
import { parseConfig } from "@/domain/advancedOptimiser/config";
import { makeTargetContext } from "../../fixtures/advancedOptimiser";

const ACTIVITY = makeTargetContext();
const RECIPE = makeTargetContext({ isRecipe: true });
const CRAFTED_RECIPE = makeTargetContext({ isRecipe: true, producesCraftedItem: true });

const applicableIds = (ctx: typeof ACTIVITY) =>
  BUILTIN_PRESETS.filter((p) => isPresetApplicable(p, ctx)).map((p) => p.id);

const preset = (targets: OptimiserPreset["targets"]): OptimiserPreset => ({
  id: "user:1",
  name: "Test",
  targets,
  builtin: false,
});

describe("BUILTIN_PRESETS", () => {
  it("have unique builtin ids", () => {
    const ids = BUILTIN_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(builtinPresetSlug(id)).not.toBeNull();
  });

  it("survive parseConfig unchanged", () => {
    for (const p of BUILTIN_PRESETS) {
      expect(parseConfig(configFromPreset(p, "a"))?.targets).toEqual(p.targets);
    }
  });

  it("each have more than one target", () => {
    for (const p of BUILTIN_PRESETS) expect(p.targets.length).toBeGreaterThan(1);
  });

  it.each([
    ["an activity", ACTIVITY, ["builtin:max-xp"]],
    ["a recipe", RECIPE, ["builtin:max-xp", "builtin:items-per-material"]],
    [
      "a crafted recipe",
      CRAFTED_RECIPE,
      ["builtin:max-xp", "builtin:items-per-material", "builtin:eternal-per-material"],
    ],
  ])("offers the right presets for %s", (_, ctx, expected) => {
    expect(applicableIds(ctx)).toEqual(expected);
  });
});

describe("isPresetApplicable", () => {
  it("rejects a preset with no targets", () => {
    expect(isPresetApplicable(preset([]), ACTIVITY)).toBe(false);
  });

  it("needs every target to be valid", () => {
    const p = preset([
      { x: "xp", y: "step", weight: 10 },
      { x: "chests", y: "step", weight: 3 },
    ]);
    expect(isPresetApplicable(p, ACTIVITY)).toBe(false);
    expect(isPresetApplicable(p, makeTargetContext({ hasChests: true }))).toBe(true);
  });
});

describe("targetsEqual", () => {
  const a = { x: "xp", y: "step", weight: 10 } as const;
  const b = { x: "chests", y: "action", weight: 3 } as const;

  it("ignores order", () => {
    expect(targetsEqual([a, b], [b, a])).toBe(true);
  });

  it("compares weights and length", () => {
    expect(targetsEqual([a, b], [a, { ...b, weight: 4 }])).toBe(false);
    expect(targetsEqual([a, b], [a])).toBe(false);
  });
});

describe("pickDefaultPreset", () => {
  it("picks the first preset that applies", () => {
    const recipeOnly = { ...preset([{ x: "rewardRolls", y: "material", weight: 10 }]), id: "user:2" };
    const presets = [recipeOnly, ...BUILTIN_PRESETS];
    expect(pickDefaultPreset(presets, RECIPE)?.id).toBe("user:2");
    expect(pickDefaultPreset(presets, ACTIVITY)?.id).toBe("builtin:max-xp");
  });

  it("returns null when nothing applies", () => {
    expect(pickDefaultPreset([preset([{ x: "chests", y: "step", weight: 1 }])], ACTIVITY)).toBeNull();
  });
});

describe("configFromPreset", () => {
  it("copies the targets and remembers the preset", () => {
    const [p] = BUILTIN_PRESETS;
    const config = configFromPreset(p, "act_1");
    expect(config.mode).toEqual({ kind: "singleActivity", activityId: "act_1" });
    expect(config.presetId).toBe(p.id);
    expect(config.targets).toEqual(p.targets);
    expect(config.targets[0]).not.toBe(p.targets[0]);
  });
});

describe("preset ids", () => {
  it("round-trips user preset ids", () => {
    expect(userPresetDbId(userPresetId(12))).toBe(12);
  });

  it.each(["builtin:max-xp", "user:abc", "user:0", "12"])("has no database id for %s", (id) => {
    expect(userPresetDbId(id)).toBeNull();
  });

  it("reads built-in slugs", () => {
    expect(builtinPresetSlug("builtin:max-xp")).toBe("max-xp");
    expect(builtinPresetSlug("user:1")).toBeNull();
  });
});
