/**
 * Purpose:
 * Common and fine counts of an owned consumable, and the owned-item fields
 * that follow from them.
 *
 * Counts are the source of truth: `quantity` is common + fine together and
 * `quantityFine` the fine part. The `consumableCommon` / `consumableFine`
 * flags and `owned` are derived (count > 0) and written alongside the counts.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or access stores.
 */

export type ConsumableCounts = { common: number; fine: number };

type CountFields = { quantity?: number | null; quantityFine?: number | null };

/** Owned-item fields for a consumable with these counts. */
export type ConsumableEntryFields = {
  owned: boolean;
  quantity: number;
  quantityFine: number;
  consumableCommon: boolean;
  consumableFine: boolean;
};

/** Clamps a count to a whole number ≥ 0 (non-numbers count as 0). */
export const toCount = (value: unknown): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Common and fine counts of an owned-item entry (missing entry: both 0). */
export const consumableCounts = (entry: CountFields | null | undefined): ConsumableCounts => {
  const fine = toCount(entry?.quantityFine);
  return { common: Math.max(0, toCount(entry?.quantity) - fine), fine };
};

/** The owned-item fields to write for a consumable with these counts. */
export const consumableEntryFields = (common: number, fine: number): ConsumableEntryFields => {
  const c = toCount(common);
  const f = toCount(fine);
  return {
    owned: c + f > 0,
    quantity: c + f,
    quantityFine: f,
    consumableCommon: c > 0,
    consumableFine: f > 0,
  };
};
