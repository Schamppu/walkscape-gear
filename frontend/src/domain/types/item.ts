/**
 * Purpose:
 * Shared item-related types used across the domain layer.
 *
 * API response shapes are derived from the generated OpenAPI types
 * (`./generated/api`, regenerate with `npm run gen:api-types`). Only
 * frontend-only extensions and endpoints missing from the spec are written
 * by hand here.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { components } from "./generated/api";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// Attribute / stat types
// ---------------------------------------------------------------------------

export type Stat = NonNullable<Schemas["AttrStat"]>;

export type Attribute = Schemas["Attribute"] & {
  /**
   * Optional override for the stat-source shown in aggregation. Used when an
   * attribute originates from a source other than the item carrying it (e.g. a
   * pet ability, which should be attributed to the ability, not the pet).
   */
  sourceItem?: { id: string; name: string; icon: string };
};

export type QualityAttr = NonNullable<Schemas["ItemQualityAttributes"]>[number];

export type ItemQuality = Schemas["ItemQuality"];

export type GearType = Schemas["GearType"];

// ---------------------------------------------------------------------------
// Buff types
// ---------------------------------------------------------------------------

export type Buff = Schemas["Buff"];

export type BuffData = Buff["data"][number];

export type BuffObj = BuffData["buffs"][number];

// ---------------------------------------------------------------------------
// Gear item types
// ---------------------------------------------------------------------------

export type GearItem = Pick<Schemas["CraftedItem"], "itemAttrs" | "itemQualityAttrs">;

export type ConsumableItem = Pick<Schemas["ConsumableItem"], "buffs">;

// ---------------------------------------------------------------------------
// Pet types
// ---------------------------------------------------------------------------

type PetDetail = Schemas["PetDetail"];

export type PetEgg = PetDetail["egg"];

export type PetLook = PetDetail["looks"][number];

export type PetSprite = PetLook["sprites"][number];

export type PetLevel = PetDetail["levels"][number];

export type PetItem = Pick<PetDetail, "egg" | "looks" | "rareLooks" | "levels"> & {
  /**
   * Resolved attributes from the pet's unlocked abilities, attached by the
   * composable layer (which has store access) before the item reaches
   * `usedAttrs`. Passive abilities are always present; active abilities only
   * when enabled. Each attribute carries a `sourceItem` pointing to the ability.
   */
  abilityAttrs?: Attribute[];
};

// ---------------------------------------------------------------------------
// Material item type
// ---------------------------------------------------------------------------

export type MaterialItem = Pick<Schemas["MaterialItem"], "materialAttrs">;

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type Item = GearItem | ConsumableItem | PetItem | MaterialItem;

// ---------------------------------------------------------------------------
// Item API types
// ---------------------------------------------------------------------------

export type ItemSummary = Schemas["ItemListItem"];

/** Discriminated on `type` ("crafted", "consumable", "material", ...). */
export type ItemDetail = Schemas["ItemDetail"];

type WithSelectedQuality<T> = T extends unknown
  ? Omit<T, "quality"> & { quality: string }
  : never;

/**
 * An `ItemDetail` whose `quality` holds the tier selected on the frontend,
 * which is wider than the API's quality enum: the owned crafted tier,
 * "consumableCommon" / "consumableFine", or a pet's level as a string.
 */
export type SelectedQualityItem = WithSelectedQuality<ItemDetail>;

// The endpoints below are served by this repo's own backend
// (backend/src/routes/itemRoutes.js), not the tools API, so their types are
// written by hand.

export type ItemCategory = {
  title: string;
  key: string;
  items: ItemDetail[];
};

export type ItemCategoryGroup = {
  title: string;
  categories: ItemCategory[];
};

// ---------------------------------------------------------------------------
// Item value mapping
// ---------------------------------------------------------------------------

export type QualityValues = {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
  ethereal: number;
};

export type ItemValueMap = Record<string, QualityValues>;

// ---------------------------------------------------------------------------
// Item URL mapping
// ---------------------------------------------------------------------------

export type UrlMap = Record<string, (string | null)[]>;
