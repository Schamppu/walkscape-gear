import { describe, it, expect } from "vitest";
import {
  BUILTIN_PRESETS,
  builtinPresetSlug,
  configFromPreset,
  isPresetApplicable,
  pickDefaultPreset,
  MAX_PRESET_TARGETS,
  MAX_PRESET_NAME_LENGTH,
  presetFromDb,
  presetNameProblem,
  presetTargetsProblem,
  targetsEqual,
  userPresetDbId,
  userPresetId,
  type OptimiserPreset,
} from "@/domain/advancedOptimiser/presets";
import { parseConfig } from "@/domain/advancedOptimiser/config";
import { makeTargetContext } from "../../fixtures/advancedOptimiser";

const ACTIVITY = makeTargetContext();
const RECIPE = makeTargetContext({ isRecipe: true });
const CRAFTED_RECIPE = makeTargetContext({
  isRecipe: true,
  producesCraftedItem: true,
});

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

  it.each([
    ["an activity", ACTIVITY, ["builtin:balanced"]],
    ["a recipe", RECIPE, ["builtin:items-per-material", "builtin:balanced"]],
    [
      "a crafted recipe",
      CRAFTED_RECIPE,
      [
        "builtin:eternal-per-material",
        "builtin:items-per-material",
        "builtin:balanced",
      ],
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
    expect(isPresetApplicable(p, makeTargetContext({ hasChests: true }))).toBe(
      true,
    );
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
    const recipeOnly = {
      ...preset([{ x: "rewardRolls", y: "material", weight: 10 }]),
      id: "user:2",
    };
    const presets = [recipeOnly, ...BUILTIN_PRESETS];
    expect(pickDefaultPreset(presets, RECIPE)?.id).toBe("user:2");
    expect(pickDefaultPreset(presets, ACTIVITY)?.id).toBe("builtin:balanced");
  });

  it("returns null when nothing applies", () => {
    expect(
      pickDefaultPreset(
        [preset([{ x: "chests", y: "step", weight: 1 }])],
        ACTIVITY,
      ),
    ).toBeNull();
  });
});

describe("configFromPreset", () => {
  it("copies the targets and remembers the preset", () => {
    const [p] = BUILTIN_PRESETS;
    const config = configFromPreset(p, "act_1");
    expect(config.mode).toEqual({
      kind: "singleActivity",
      activityId: "act_1",
    });
    expect(config.presetId).toBe(p.id);
    expect(config.targets).toEqual(p.targets);
    expect(config.targets[0]).not.toBe(p.targets[0]);
  });
});

describe("presetNameProblem", () => {
  it.each([
    "Mine",
    "  Fishing 🎣  ",
    "Café",
    "x".repeat(MAX_PRESET_NAME_LENGTH),
  ])("accepts %j", (name) => {
    expect(presetNameProblem(name)).toBeNull();
  });

  it.each([
    "",
    "   ",
    "x".repeat(MAX_PRESET_NAME_LENGTH + 1),
    "a​b",
    "a\nb",
    "‮abc",
  ])("rejects %j", (name) => {
    expect(presetNameProblem(name)).not.toBeNull();
  });
});

describe("presetTargetsProblem", () => {
  it("needs 1 to 8 targets", () => {
    const xp = { x: "xp", y: "step", weight: 1 } as const;
    expect(presetTargetsProblem([])).not.toBeNull();
    expect(presetTargetsProblem([xp])).toBeNull();
    expect(presetTargetsProblem(Array(MAX_PRESET_TARGETS).fill(xp))).toBeNull();
    expect(
      presetTargetsProblem(Array(MAX_PRESET_TARGETS + 1).fill(xp)),
    ).not.toBeNull();
  });
});

describe("presetFromDb", () => {
  it("maps a saved preset and cleans its targets", () => {
    expect(
      presetFromDb({
        id: 4,
        name: "Mine",
        sortOrder: 0,
        targets: [
          { x: "xp", y: "step", weight: 12 },
          { x: "unknown", y: "step", weight: 1 },
          { x: "xp", y: "step", weight: 2 },
        ],
      }),
    ).toEqual({
      id: "user:4",
      name: "Mine",
      targets: [{ x: "xp", y: "step", weight: 10 }],
      builtin: false,
    });
  });
});

describe("preset ids", () => {
  it("round-trips user preset ids", () => {
    expect(userPresetDbId(userPresetId(12))).toBe(12);
  });

  it.each(["builtin:balanced", "user:abc", "user:0", "12"])(
    "has no database id for %s",
    (id) => {
      expect(userPresetDbId(id)).toBeNull();
    },
  );

  it("reads built-in slugs", () => {
    expect(builtinPresetSlug("builtin:balanced")).toBe("balanced");
    expect(builtinPresetSlug("user:1")).toBeNull();
  });
});
