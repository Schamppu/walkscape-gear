/**
 * Purpose:
 * Utility functions for calculating skill levels and xp.
 *
 * Responsibilities:
 * - Calculate XP required for each level (1-99)
 * - Determine skill level from current XP
 * - Provide progress and next-level XP helpers
 *
 * Does NOT:
 * - Handle any UI logic or state management related to skill levels
 * - Calculate XP for levels above 99 (max level in Walkscape)
 */

import { levelEquate } from "./levelUtils";

// Calculates the experience needed to level up a skill to a given level
export function xpToSkillLevel(level: number): number {
  let xp = 0;
  for (let i = 1; i <= level; i++) {
    xp += levelEquate(i);
  }
  return Math.floor(xp / 4);
}

// Pre-calculate XP lookup table for levels 1-99
export const XP_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let level = 1; level <= 99; level++) {
    table[level] = xpToSkillLevel(level - 1);
  }
  return table;
})();

// Calculates the character level from current XP using lookup table
export function skillLevelFromXp(currentXp: number): number {
  if (currentXp <= 0) return 1;

  for (let level = 99; level >= 1; level--) {
    if (currentXp >= XP_TABLE[level]) {
      return level;
    }
  }

  return 1;
}

// Calculates XP progress within current level (0-1)
export function xpProgressInSkillLevel(currentXp: number): number {
  const level = skillLevelFromXp(currentXp);
  const xpForCurrentLevel = XP_TABLE[level];
  const xpForNextLevel = level < 99 ? XP_TABLE[level + 1] : XP_TABLE[99];

  if (level >= 99) return 1;
  if (xpForNextLevel <= xpForCurrentLevel) return 0;

  const progressXp = currentXp - xpForCurrentLevel;
  const levelXpRange = xpForNextLevel - xpForCurrentLevel;

  return Math.min(1, Math.max(0, progressXp / levelXpRange));
}

// Calculates how much XP is needed to reach the next level
export function xpToNextSkillLevel(currentXp: number): number {
  const level = skillLevelFromXp(currentXp);

  if (level >= 99) return 0;

  const xpForNextLevel = XP_TABLE[level + 1];
  return Math.max(0, xpForNextLevel - currentXp);
}

export default {
  xpToSkillLevel,
  skillLevelFromXp,
  xpProgressInSkillLevel,
  xpToNextSkillLevel,
  XP_TABLE,
};
