/**
 * Purpose:
 * Pure helper functions for gear-set state management.
 *
 * Responsibilities:
 * - Derive display slot names from raw slotType + slotIndex values.
 * - Resolve tag IDs to full DbTag objects.
 * - Build a complete gear-slot mapping from a set's item list.
 *
 * Does NOT:
 * - Import Vue or Pinia.
 * - Access any store state directly.
 * - Contain side effects.
 */

import type { DbTag, DbGearSetItem } from "@/domain/types/db";

// ---------------------------------------------------------------------------
// Slot naming
// ---------------------------------------------------------------------------

/**
 * Return the canonical slot name for a DB gear-set item.
 *
 * Multi-slot types ("ring", "tool") use a 1-based index suffix.
 * All other slot types are returned as-is.
 *
 * @example resolveSlotName("ring", 0) → "ring1"
 * @example resolveSlotName("chest", 0) → "chest"
 */
export function resolveSlotName(slotType: string, slotIndex: number): string {
  return ["ring", "tool"].includes(slotType)
    ? `${slotType}${slotIndex + 1}`
    : slotType;
}

// ---------------------------------------------------------------------------
// Tag resolution
// ---------------------------------------------------------------------------

/** Resolve an array of tag ID strings into full DbTag objects, skipping any unknown IDs. */
export function resolveTagsFromIds(tagIds: string[], allTags: DbTag[]): DbTag[] {
  return tagIds
    .map((id) => allTags.find((tag) => tag.id === id))
    .filter((tag): tag is DbTag => tag !== undefined);
}

// ---------------------------------------------------------------------------
// Slot-mapping construction
// ---------------------------------------------------------------------------

/** The item-level fields needed when building a slot mapping. */
type GearSetItem = Pick<DbGearSetItem, "slotType" | "slotIndex" | "itemId" | "quality">;

/** A slot map entry: the item that should be equipped, or null to unequip. */
export type SlotEntry = { id: string; quality: string | null } | null;

/**
 * Build a complete slot mapping from a gear set's item list.
 *
 * - Items from `items` are mapped to their canonical slot names.
 * - Slots present in `existingSlotKeys` but absent from the items list are set
 *   to `null` (unequipped), unless their key appears in `slotsToSkip`.
 *
 * @param items         The gear-set items to map.
 * @param existingSlotKeys  All slot keys that currently exist in the gear store.
 * @param slotsToSkip   Slot keys that should never be nulled out (e.g. service, consumable).
 */
export function buildGearSlotMapping(
  items: GearSetItem[],
  existingSlotKeys: string[],
  slotsToSkip: string[] = [],
): Record<string, SlotEntry> {
  const mapping: Record<string, SlotEntry> = {};

  for (const { slotType, slotIndex, itemId, quality } of items) {
    const slotName = resolveSlotName(slotType, slotIndex);
    mapping[slotName] = { id: itemId, quality: quality ?? null };
  }

  for (const key of existingSlotKeys) {
    if (!slotsToSkip.includes(key) && !(key in mapping)) {
      mapping[key] = null;
    }
  }

  return mapping;
}
