/**
 * Purpose:
 * Normalises target values against the naked-gear baseline, so targets with
 * different units can be weighted against each other.
 *
 * A normalised value of 1.3 means "30% more than with no gear equipped".
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Compute the naked modifiers; the caller passes a naked `ExtractionContext`.
 */

import type { Target } from "./config";
import { extracted, type ExtractionContext } from "./targets";

export type Baseline = Map<string, number>;

export const targetKey = ({ x, y }: Pick<Target, "x" | "y">): string => `${x}/${y}`;

/** Extracts each distinct target once from the naked-gear context. */
export const computeBaseline = (
  targets: readonly Target[],
  nakedCtx: ExtractionContext,
): Baseline => {
  const baseline: Baseline = new Map();
  for (const target of targets) {
    const key = targetKey(target);
    if (!baseline.has(key)) baseline.set(key, extracted(target.x, target.y, nakedCtx));
  }
  return baseline;
};

/**
 * How `value` compares with the naked baseline: `1 + (value − base) / |base|`.
 * For a positive baseline that's `value / base`; it also works for a negative
 * one (net coins of a loss-making recipe), where getting closer to 0 is
 * better. Returns `null` when the baseline is 0 or missing (the target can't
 * be compared, so it's left out of the score).
 */
export const normalise = (baseline: Baseline, target: Target, value: number): number | null => {
  const base = baseline.get(targetKey(target));
  if (base === undefined || base === 0 || !Number.isFinite(base)) return null;
  return 1 + (value - base) / Math.abs(base);
};
