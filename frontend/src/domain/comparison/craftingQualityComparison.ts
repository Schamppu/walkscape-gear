/**
 * Purpose:
 * Pure function for building a side-by-side crafting quality comparison.
 *
 * Responsibilities:
 * - Zip two `QualityOutcomeResult` arrays into comparison rows.
 * - Compute `oddsComp` (gs1 - gs2) and `matsComp` (gs2 - gs1) for each tier.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

import type { QualityOutcomeResult } from "@/domain/quality/qualityOutcomeOdds";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { QualityOutcomeResult };

/** One row of the crafting quality comparison table. */
export type CraftingOddsRow = {
  gs1: QualityOutcomeResult;
  gs2: QualityOutcomeResult;
  /** Positive = gs1 has higher odds for this tier. */
  oddsComp: number;
  /** Positive = gs1 needs fewer materials for this tier. */
  matsComp: number;
};

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Zips two quality outcome arrays into comparison rows.
 *
 * Arrays must have the same length and same tier ordering (as produced by
 * `getOutcomeOdds` with identical parameters).
 *
 * @param stats1  Quality outcomes for gear set 1.
 * @param stats2  Quality outcomes for gear set 2.
 */
export function buildCraftingOddsComparison(
  stats1: QualityOutcomeResult[],
  stats2: QualityOutcomeResult[],
): CraftingOddsRow[] {
  return stats1.map((gs1, index) => {
    const gs2 = stats2[index];
    return {
      gs1,
      gs2,
      oddsComp: gs1.value - gs2.value,
      matsComp: gs2.materialsNeeded - gs1.materialsNeeded,
    };
  });
}
