/**
 * Purpose:
 * Pure helpers for computing display data used in ActivityInfo.vue sections.
 *
 * Responsibilities:
 * - Round effectiveMaxWorkEfficiency to nearest 0.25% for display.
 * - Compute stepsPerRep from a faction reward and stepsPerAction.
 * - Separate skill-level requirements from other requirement types.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

import type { Requirement } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Activity ID used for the travel activity. */
export const TRAVEL_ACTIVITY_ID = "travelling";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Requirement types split into skill-level and non-skill-level groups. */
export type ClassifiedRequirements = {
  /** Skill-level requirements (type === "skillLevel"). */
  skillLevel: Requirement[];
  /** All other requirement types. */
  other: Requirement[];
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Rounds an effectiveMaxWorkEfficiency value (0–1 scale) to the nearest 0.25%
 * for display purposes only.
 *
 * Formula: ceil(we × 400) / 4 — gives two-decimal result in percentage units
 * where the resolution is 0.25.
 *
 * @param we  Work efficiency in 0–1 range.
 */
export function roundToQuarterPercent(we: number): number {
  return Math.ceil(we * 400) / 4;
}

/**
 * Computes the number of steps required to earn one full faction reputation
 * point from an activity reward.
 *
 * @param rewardAmount   Reputation gained per action completion.
 * @param stepsPerAction Steps required per action.
 */
export function computeStepsPerRep(
  rewardAmount: number,
  stepsPerAction: number,
): number {
  return (1 / rewardAmount) * stepsPerAction;
}

/**
 * Splits a requirement array into skill-level requirements and all others.
 *
 * @param requirements  Raw requirement list from ActivityDetail (may be null/undefined).
 */
export function classifyRequirements(
  requirements: Requirement[] | null | undefined,
): ClassifiedRequirements {
  const list = requirements ?? [];
  return {
    skillLevel: list.filter(({ type }) => type === "skillLevel"),
    other: list.filter(({ type }) => type !== "skillLevel"),
  };
}
