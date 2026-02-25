/**
 * Purpose:
 * Shared optimiser-specific types used across the optimiser domain and utilities.
 * Centralised here so that no two optimiser files need to import types from
 * each other, preventing type-level circular references.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { ItemDetail, Stat } from "@/domain/types/item";
import type { LocationSummary } from "@/domain/types/location";

// ---------------------------------------------------------------------------
// Item types
// ---------------------------------------------------------------------------

/**
 * An `ItemDetail` enriched with pre-computed attribute lists after
 * `mapItemToStats` runs.
 *
 * `level` and `abilities` are optional runtime properties present on some gear
 * items.  They are not part of the canonical `ItemDetail` domain type but are
 * accessed by `contributesToReq` and `filterItemsForReq` respectively.
 */
export type MappedItem = ItemDetail & {
  stats: Stat[];
  usefulStats: Stat[];
  level?: number;
  abilities?: (string | { ability: string; unlockLevel: string })[];
};

/**
 * A `MappedItem` further enriched with a pre-computed optimiser score.
 */
export type OptimiserItem = MappedItem & {
  score: number;
};

// ---------------------------------------------------------------------------
// Gear set types
// ---------------------------------------------------------------------------

/**
 * A partial mapping of slot names to equipped items, plus an optional location.
 * The index signature uses `string` keys to allow dynamic slot names such as
 * `"ring1"`, `"tool3"`, etc.
 */
export type GearSet = {
  location?: LocationSummary | null;
  [slot: string]: OptimiserItem | LocationSummary | null | undefined;
};

// ---------------------------------------------------------------------------
// Gear option types
// ---------------------------------------------------------------------------

export type SlotOptions = {
  required: OptimiserItem[];
  /** Location slot uses `LocationSummary`; all other slots use `OptimiserItem`. */
  primary: (OptimiserItem | LocationSummary)[];
};

export type GearOptions = Record<string, SlotOptions>;

// ---------------------------------------------------------------------------
// Beam-search candidate types
// ---------------------------------------------------------------------------

export type Candidate = {
  gearSet: GearSet;
  score: number;
  slotCounts: Record<string, number>;
};

export type FulfilledCandidate = Candidate & {
  fulfilled: number;
};
