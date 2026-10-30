/**
 * Purpose:
 * Named optimiser presets: the built-in ones defined here, and the player's
 * own ones saved to the backend. A preset is only a named list of targets.
 *
 * Preset ids are `builtin:<slug>` or `user:<database id>`, so a config can
 * remember which preset it came from either way.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Fetch or save user presets (see the optimiser presets store).
 */

import { MAX_WEIGHT, type AdvancedOptimiserConfig, type Target } from "./config";
import { isTargetValid, type TargetContext } from "./targets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OptimiserPreset = {
  id: string;
  name: string;
  /** Plain-language explanation, for built-in presets. */
  description?: string;
  targets: Target[];
  builtin: boolean;
};

// ---------------------------------------------------------------------------
// Built-in presets
// ---------------------------------------------------------------------------

const BUILTIN_PREFIX = "builtin:";
const USER_PREFIX = "user:";

// Each has a secondary target: a set optimised for one target alone tends to
// be poor at everything else, while a low-weight second target costs little.
export const BUILTIN_PRESETS: readonly OptimiserPreset[] = [
  {
    id: `${BUILTIN_PREFIX}balanced`,
    name: "Balanced",
    description: "A good balance of XP, and drops.",
    targets: [
      { x: "xp", y: "step", weight: MAX_WEIGHT },
      { x: "rewardRolls", y: "step", weight: 3 },
    ],
    builtin: true,
  },
  {
    id: `${BUILTIN_PREFIX}items-per-material`,
    name: "Items per material",
    description: "Most items per material, great for converting fine materials.",
    targets: [
      { x: "rewardRolls", y: "material", weight: MAX_WEIGHT },
    ],
    builtin: true,
  },
  {
    id: `${BUILTIN_PREFIX}eternal-per-material`,
    name: "Eternal crafts per material",
    description: "All out most eternal crafts per material.",
    targets: [
      { x: "eternalCrafts", y: "material", weight: MAX_WEIGHT }
    ],
    builtin: true,
  },
];

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export const userPresetId = (dbId: number): string => `${USER_PREFIX}${dbId}`;

/** Database id of a user preset, or `null` for built-in or unknown ids. */
export const userPresetDbId = (presetId: string): number | null => {
  if (!presetId.startsWith(USER_PREFIX)) return null;
  const id = Number(presetId.slice(USER_PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** The slug of a built-in preset (`builtin:max-xp` → `max-xp`), or `null`. */
export const builtinPresetSlug = (presetId: string): string | null =>
  presetId.startsWith(BUILTIN_PREFIX) ? presetId.slice(BUILTIN_PREFIX.length) : null;

/** A preset is offered only when every one of its targets is valid here. */
export const isPresetApplicable = (preset: OptimiserPreset, ctx: TargetContext): boolean =>
  preset.targets.length > 0 && preset.targets.every((t) => isTargetValid(t, ctx));

/** Same targets and weights, in any order. */
export const targetsEqual = (a: readonly Target[], b: readonly Target[]): boolean =>
  a.length === b.length &&
  a.every(({ x, y, weight }) => b.some((t) => t.x === x && t.y === y && t.weight === weight));

/** The preset a source with no saved config starts from: the first one that applies. */
export const pickDefaultPreset = (
  presets: readonly OptimiserPreset[],
  ctx: TargetContext,
): OptimiserPreset | null => presets.find((p) => isPresetApplicable(p, ctx)) ?? null;

/** A single-activity config with a copy of the preset's targets. */
export const configFromPreset = (
  preset: OptimiserPreset,
  activityId: string,
): AdvancedOptimiserConfig => ({
  mode: { kind: "singleActivity", activityId },
  targets: preset.targets.map((t) => ({ ...t })),
  combinationRule: "weightedSum",
  presetId: preset.id,
});
