/**
 * Purpose:
 * Combines a gear set's normalised target values into a single score.
 * Only the weighted sum exists for now; strategies are keyed by
 * `CombinationRule` so more can be added.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 */

import type { CombinationRule, Target } from "./config";

export type ScoredTarget = {
  target: Target;
  /** `null` when the target has no baseline to compare against. */
  normalised: number | null;
};

export type CombinationStrategy = (entries: readonly ScoredTarget[]) => number;

/** Σ weight × normalised value, skipping unscored and weight-0 targets. */
export const weightedSum: CombinationStrategy = (entries) =>
  entries.reduce(
    (sum, { target, normalised }) =>
      normalised === null || target.weight <= 0 ? sum : sum + target.weight * normalised,
    0,
  );

export const COMBINATION_STRATEGIES: Record<CombinationRule, CombinationStrategy> = {
  weightedSum,
};

/**
 * How much better a set is than naked gear overall: the weighted mean of the
 * targets' ratios minus 1 (0.31 = 31% better). Targets without a ratio or
 * with weight 0 are left out; returns 0 when none remain.
 */
export const overallImprovement = (
  targets: readonly Target[],
  ratios: Record<string, number | null>,
): number => {
  let weighted = 0;
  let totalWeight = 0;
  for (const target of targets) {
    const ratio = ratios[`${target.x}/${target.y}`];
    if (ratio == null || target.weight <= 0) continue;
    weighted += target.weight * ratio;
    totalWeight += target.weight;
  }
  return totalWeight > 0 ? weighted / totalWeight - 1 : 0;
};
