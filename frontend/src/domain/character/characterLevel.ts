/**
 * Purpose:
 * Utility functions for calculating character levels based on user steps.
*
* Responsibilities:
* - Calculate the toolbelt size based on character level
* - Convert steps to character level using a pre-calculated XP table
*
 * Does NOT:
 * - Handle any UI logic or state management related to character levels
 * - Calculate XP for levels above 99 (max level in Walkscape)
*/

import { levelEquate } from "./levelUtils";

// thresholds for toolbelt sizes based on character level
const toolbeltSizes: Record<number, number> = {
  1: 3,
  20: 4,
  50: 5,
  80: 6,
};

// get the toolbelt size for a given character level
export function getToolbeltSize(level: number): number {
  const threshold = Object.keys(toolbeltSizes)
    .reverse()
    .find((value) => Number(value) <= level);
  return threshold ? toolbeltSizes[Number(threshold)] : 3;
}

// Calculate the total steps required to reach a given level
const stepsToCharacterLevel = (level: number): number => {
  let steps = 0;
  for (let i = 1; i <= level; i++) {
    steps += levelEquate(i);
  }
  return Math.floor(steps / 4) * 4.6;
};

// Pre-calculate steps lookup table for levels 1-99
const STEPS_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let level = 1; level <= 99; level++) {
    table[level] = stepsToCharacterLevel(level - 1);
  }
  return table;
})();

// Convert steps to character level using the pre-calculated STEPS_TABLE
export function characterLevelFromSteps(steps: number): number {
  if (steps <= 0) return 1;

  // Find the highest level where required steps <= current steps
  for (let level = 99; level >= 1; level--) {
    if (steps >= STEPS_TABLE[level]) {
      return level;
    }
  }

  return 1; // Fallback
}

export default {
  getToolbeltSize,
  characterLevelFromSteps,
};
