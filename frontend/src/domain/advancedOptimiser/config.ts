/**
 * Purpose:
 * Config types for the advanced optimiser, and the default config.
 *
 * A target is an `X / Y` ratio ("what you want more of" per "what"),
 * weighted 0–10. Weight 0 disables the target.
 *
 * Slot locks are not part of the config: the optimiser reads them from the
 * gear store, same as the quick set.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Decide which targets are valid for an activity (see `targets.ts`).
 */

import type { components } from "@/domain/types/generated/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const X_VALUES = [
  "xp",
  "rewardRolls",
  "fineMaterials",
  "chests",
  "tokens",
  "collectibles",
  "eternalCrafts",
] as const;

export const Y_VALUES = ["step", "action", "material"] as const;

export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type XValue = (typeof X_VALUES)[number];

export type YValue = (typeof Y_VALUES)[number];

export type Target = { x: XValue; y: YValue; weight: number };

export type CombinationRule = "weightedSum";

export type AdvancedOptimiserMode =
  | { kind: "singleActivity"; activityId: string }
  | { kind: "bestForSkill"; skillId: components["schemas"]["SkillsEnum"] };

export type AdvancedOptimiserConfig = {
  mode: AdvancedOptimiserMode;
  targets: Target[];
  combinationRule: CombinationRule;
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/** Default config for a single activity or recipe. `xp / step` is valid everywhere. */
export const defaultConfig = (activityId: string): AdvancedOptimiserConfig => ({
  mode: { kind: "singleActivity", activityId },
  targets: [{ x: "xp", y: "step", weight: MAX_WEIGHT }],
  combinationRule: "weightedSum",
});
