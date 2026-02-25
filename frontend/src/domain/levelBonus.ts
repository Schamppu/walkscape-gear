/**
 * Purpose:
 * Pure calculation functions for level-above-requirement bonuses.
 *
 * Responsibilities:
 * - Compute the work efficiency bonus value from a player's level surplus.
 * - Compute the quality outcome bonus value from a player's level surplus.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any side effects.
 * - Mutate inputs.
 */

import type { Requirement } from "./types/common";
import type { Stat } from "./types/item";
import {
  EFFICIENCY_MAX_LEVEL_CAP,
  EFFICIENCY_PER_LEVEL,
  TRAVELLING_EFFICIENCY_PER_LEVEL,
} from "./constants/levelBonus";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** Shape of the synthetic bonus attribute objects used by the level bonus composable. */
export type LevelBonusAttr = {
  id: string;
  requirements: Requirement[];
  stats: Stat[];
  item: {
    id: string;
    name: string;
    icon: string;
  };
  tables: null;
};

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type WorkEfficiencyBonusInput = {
  playerLevel: number;
  levelRequirement: number;
  isTravelling: boolean;
};

export type QualityOutcomeBonusInput = {
  playerLevel: number;
  levelRequirement: number;
};

// ---------------------------------------------------------------------------
// Calculation functions
// ---------------------------------------------------------------------------

/**
 * Returns the work efficiency bonus value based on levels above requirement.
 *
 * - Travelling: 0.5% per level above requirement (uncapped).
 * - All other activities/recipes: 1.25% per level above requirement,
 *   capped at {@link EFFICIENCY_MAX_LEVEL_CAP} levels.
 */
export function calculateWorkEfficiencyBonus({
  playerLevel,
  levelRequirement,
  isTravelling,
}: WorkEfficiencyBonusInput): number {
  const levelsAbove = Math.max(playerLevel - levelRequirement, 0);

  if (isTravelling) {
    return levelsAbove * TRAVELLING_EFFICIENCY_PER_LEVEL;
  }

  const cappedLevels = Math.min(levelsAbove, EFFICIENCY_MAX_LEVEL_CAP);
  return cappedLevels * EFFICIENCY_PER_LEVEL;
}

/**
 * Returns the quality outcome bonus value based on levels above requirement.
 *
 * Each level above the requirement contributes +1 to quality outcome.
 */
export function calculateQualityOutcomeBonus({
  playerLevel,
  levelRequirement,
}: QualityOutcomeBonusInput): number {
  return Math.max(playerLevel - levelRequirement, 0);
}

// ---------------------------------------------------------------------------
// Attribute builders
// ---------------------------------------------------------------------------

/** Builds a `LevelBonusAttr` for the work efficiency bonus. */
export function buildWorkEfficiencyBonusAttr(value: number): LevelBonusAttr {
  return {
    id: "work_efficiency_bonus",
    requirements: [],
    stats: [
      {
        isMultiplicative: true,
        isNegative: false,
        isPercent: true,
        name: "Work Efficiency",
        stat: "work_efficiency",
        type: "workEfficiency",
        value,
      },
    ],
    item: {
      id: "work_efficiency_bonus",
      name: "From levels above requirement",
      icon: "",
    },
    tables: null,
  };
}

/** Builds a `LevelBonusAttr` for the quality outcome bonus. */
export function buildQualityOutcomeBonusAttr(value: number): LevelBonusAttr {
  return {
    id: "quality_outcome_bonus",
    requirements: [],
    stats: [
      {
        isMultiplicative: true,
        isNegative: false,
        isPercent: false,
        name: "Quality Outcome",
        stat: "quality_outcome",
        type: "qualityOutcome",
        value,
      },
    ],
    item: {
      id: "quality_outcome_bonus",
      name: "From levels above requirement",
      icon: "",
    },
    tables: null,
  };
}
