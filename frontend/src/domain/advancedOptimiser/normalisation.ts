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
 * Returns `value / baseline`, or `null` when the target has no positive
 * baseline (it can't be compared, so it is left out of the score).
 */
export const normalise = (baseline: Baseline, target: Target, value: number): number | null => {
  const base = baseline.get(targetKey(target));
  if (base === undefined || !(base > 0)) return null;
  return value / base;
};
