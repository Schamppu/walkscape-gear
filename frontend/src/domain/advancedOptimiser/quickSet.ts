/**
 * Purpose:
 * Runs the quick set through the advanced optimiser: maps the quick set's
 * single priority setting to advanced targets, and a reduced search that
 * finishes fast.
 *
 * The quick search skips set moves and pair swaps, so it can miss set
 * bonuses and work-efficiency-cap combinations the full optimiser finds.
 *
 * Does NOT:
 * - Import Vue / reactive APIs.
 */

import type { Target } from "./config";
import { DEFAULT_SEARCH_SETTINGS, type SearchSettings } from "./search";

/**
 * Targets for each quick-set priority (values from `optimiserPriorities.ts`).
 * "Balanced" used to rank by rolls × √XP; weights 2:1 rank sets the same way
 * near the current gear (2·Δrolls + 1·ΔXP in relative terms).
 */
const QUICK_SET_TARGETS: Record<string, Target[]> = {
  balanced: [
    { x: "rewardRolls", y: "step", weight: 2 },
    { x: "xp", y: "step", weight: 1 },
  ],
  stepsPerRewardRoll: [{ x: "rewardRolls", y: "step", weight: 1 }],
  xpPerStep: [{ x: "xp", y: "step", weight: 1 }],
  stepsPerFineRoll: [{ x: "fineMaterials", y: "step", weight: 1 }],
  stepsPerCollectibleRoll: [{ x: "collectibles", y: "step", weight: 1 }],
  balancedRecipe: [
    { x: "rewardRolls", y: "material", weight: 2 },
    { x: "xp", y: "step", weight: 1 },
  ],
  craftsPerMaterial: [{ x: "rewardRolls", y: "material", weight: 1 }],
  averageEternalCrafts: [{ x: "eternalCrafts", y: "material", weight: 1 }],
};

/** Advanced targets for a quick-set priority. Unknown priorities fall back to reward rolls / step. */
export const quickSetTargets = (priority: string): Target[] =>
  (QUICK_SET_TARGETS[priority] ?? QUICK_SET_TARGETS.stepsPerRewardRoll).map((t) => ({ ...t }));

/** A short search: narrow beam, one climbed seed, single moves only. */
export const QUICK_SEARCH_SETTINGS: SearchSettings = {
  ...DEFAULT_SEARCH_SETTINGS,
  beamWidth: 10,
  climbedSeeds: 1,
  patience: 5,
  pairSamples: 0,
  setMoves: false,
  timeBudgetMs: 2_000,
};
