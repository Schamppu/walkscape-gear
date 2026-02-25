/**
 * Purpose:
 * Pure score comparison and item filtering logic for the gear optimiser.
 *
 * All functions receive the active priority as a plain string so they remain
 * framework-free; callers (utils layer) are responsible for reading the
 * priority from the settings store.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 */

import type { OptimiserItem } from "@/domain/optimiser/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LOW_STATS = [
  "stepsPerRewardRoll",
  "stepsPerFineRoll",
  "stepsPerCollectibleRoll",
] as const;

export const HIGH_STATS = ["xpPerStep", "craftsPerMaterial"] as const;

const BASE_STATS = ["work_efficiency", "double_action", "steps_required"];

const USEFUL_STATS_BY_TARGET: Record<string, string[]> = {
  stepsPerRewardRoll: [...BASE_STATS, "double_rewards"],
  xpPerStep: [...BASE_STATS, "bonus_experience"],
  stepsPerFineRoll: [...BASE_STATS, "double_rewards", "fine_material_finding"],
  stepsPerCollectibleRoll: [...BASE_STATS, "double_rewards", "find_collectibles"],
  craftsPerMaterial: [...BASE_STATS, "double_rewards", "no_materials_consumed"],
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/** Returns true when higher values are better for the given priority. */
export const isHighStat = (prio: string): boolean =>
  (HIGH_STATS as ReadonlyArray<string>).includes(prio);

/**
 * Returns the "worst possible" starting score for beam-search initialization,
 * given the active priority. Low-stat priorities start at `Infinity`;
 * high-stat priorities start at `-Infinity`.
 */
export const startScore = (prio: string): number => {
  if ((LOW_STATS as ReadonlyArray<string>).includes(prio)) return Infinity;
  if ((HIGH_STATS as ReadonlyArray<string>).includes(prio)) return -Infinity;
  return Infinity;
};

/**
 * Comparator for sorting gear sets by score.
 * Returns a positive number when `value` is better than `best`.
 *
 * Usage: `array.sort((a, b) => compareScore(b.score, a.score, prio))`
 */
export const compareScore = (value: number, best: number, prio: string): number => {
  if ((LOW_STATS as ReadonlyArray<string>).includes(prio)) return best - value;
  if ((HIGH_STATS as ReadonlyArray<string>).includes(prio)) return value - best;
  return best - value;
};

/**
 * Filters `items` down to those that have at least one stat useful for the
 * given `target` priority.
 */
export const filterUsefulStats = (
  items: OptimiserItem[],
  target: string,
): OptimiserItem[] => {
  const targetStats = USEFUL_STATS_BY_TARGET[target];
  if (!targetStats) {
    console.warn(`"${target}" is not a recognised optimiser priority`);
    return items;
  }

  return items.filter(({ usefulStats }) =>
    usefulStats.some(({ stat, isNegative }) => !isNegative && targetStats.includes(stat)),
  );
};
