/**
 * Purpose:
 * Shared level-related utilities used by character and skill level calculations.
 *
 * Responsibilities:
 * - Provide core formula(s) for level/xp/step calculations
 * - Avoid duplicating mathematical logic across modules
 *
 * Does NOT:
 * - Contain lookup tables or level-specific logic (those belong to callers)
 */

export function levelEquate(level: number): number {
  return Math.floor(level + 300 * Math.pow(2, level / 7));
}

export default levelEquate;
