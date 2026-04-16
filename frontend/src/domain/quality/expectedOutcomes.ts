/**
 * Purpose:
 * Pure functions for computing expected quality outcome statistics
 * over multiple crafting attempts.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Probability of getting at least one success in `n` independent trials
 * each with success probability `p`.
 *
 * Formula: `1 - (1 - p)^n`
 *
 * @param p  Per-craft probability of success (0–1).
 * @param n  Number of crafting attempts.
 */
export function chanceOfAtLeastOne(p: number, n: number): number {
  return 1 - (1 - p) ** n;
}
