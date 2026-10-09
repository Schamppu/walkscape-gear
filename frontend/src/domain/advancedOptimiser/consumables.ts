/**
 * Purpose:
 * Player-wide optimiser settings for consumables, and which owned consumables
 * (and qualities) the optimisers may suggest.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or access stores.
 */

import { consumableCounts } from "@/domain/items/consumableCounts";

export type OptimiserSettings = {
  /** Suggest fine consumables (they're rare, so players may want to save them). */
  allowFineConsumables: boolean;
  /**
   * Only suggest a consumable quality the player owns at least this many of
   * (common and fine counted separately, as character import records them).
   * 0 = no limit.
   */
  minConsumableStock: number;
};

export const DEFAULT_OPTIMISER_SETTINGS: OptimiserSettings = {
  allowFineConsumables: true,
  minConsumableStock: 0,
};

export const OPTIMISER_SETTINGS_STORAGE_KEY = "advancedOptimiser.settings";

export type ConsumableQuality = "common" | "fine";

type OwnedConsumable = {
  /** Common and fine together. */
  quantity: number;
  /** Fine among `quantity`; missing in data saved before it existed. */
  quantityFine?: number;
};

/** Reads stored settings back; unknown or invalid fields fall back to defaults. */
export const parseOptimiserSettings = (raw: unknown): OptimiserSettings => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof OptimiserSettings, unknown>>;
  const stock = Number(r.minConsumableStock);
  return {
    allowFineConsumables:
      typeof r.allowFineConsumables === "boolean"
        ? r.allowFineConsumables
        : DEFAULT_OPTIMISER_SETTINGS.allowFineConsumables,
    minConsumableStock: Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0,
  };
};

/**
 * The qualities of an owned consumable the optimisers may suggest, best first.
 * - `null`: no count is recorded (owned without counts); use the item's
 *   default quality.
 * - `[]`: none may be suggested (fine is off, or each owned quality's stock
 *   is below the minimum).
 *
 * Each quality's stock is checked on its own: fine = `quantityFine`, common =
 * `quantity − quantityFine`.
 */
export const suggestableConsumableQualities = (
  owned: OwnedConsumable,
  settings: OptimiserSettings,
): ConsumableQuality[] | null => {
  const { common, fine } = consumableCounts(owned);
  if (common + fine === 0) return null;

  const enough = (stock: number) => stock > 0 && stock >= settings.minConsumableStock;

  const qualities: ConsumableQuality[] = [];
  if (settings.allowFineConsumables && enough(fine)) qualities.push("fine");
  if (enough(common)) qualities.push("common");
  return qualities;
};
