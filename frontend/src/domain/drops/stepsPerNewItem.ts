/**
 * Purpose:
 * Pure functions for computing the average steps to obtain any new (unowned)
 * collectible, loot, or pet-egg item from an activity or recipe.
 *
 * "New item" = a loot/collectible/petEgg drop that is not in the player's
 * ownedItems dictionary.  For pet eggs the relevant owned-items key is the
 * pet id (item id without the "_egg" suffix).
 *
 * Chest loot items are included when a non-empty chestInfos array is passed.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores or global state.
 * - Mutate inputs.
 */

import type { DropItemInfo } from "@/domain/lootTables/dropInfo";

/** Minimal shape of chest info needed for new-item calculations. */
export type ChestDropMap = {
  dropInfoMap: Record<string, DropItemInfo>;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NewItemEntry = {
  id: string;
  icon: string | undefined;
  stepsPerItem: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Table types that qualify as "new item" candidates. */
const NEW_ITEM_TABLE_TYPES = new Set(["collectible", "petEgg"]);

/**
 * Returns true when an item qualifies as a new-item candidate based on its
 * ItemDetail type or the loot-table type it came from.
 */
function isNewItemCandidate(
  id: string,
  info: DropItemInfo,
  allGearItems: Record<string, { type: string }>,
): boolean {
  const itemType = allGearItems[id]?.type;
  if (itemType === "loot" || itemType === "collectible") return true;
  return info.sources.some((s) => s.type.some((t) => NEW_ITEM_TABLE_TYPES.has(t)));
}

/** Returns true when the player already owns this item (or its hatched pet). */
function isOwned(
  id: string,
  info: DropItemInfo,
  ownedItems: Record<string, unknown>,
): boolean {
  const isPetEgg = info.sources.some((s) => s.type.includes("petEgg"));
  if (isPetEgg) {
    const petId = id.replace(/_egg$/, "");
    return petId in ownedItems;
  }
  return id in ownedItems;
}

// ---------------------------------------------------------------------------
// Main functions
// ---------------------------------------------------------------------------

/**
 * Collects all new-item entries from the activity's drop map and from any
 * resolved chest loot tables.
 *
 * @param dropItemInfoMap  Per-item drop info from the activity / recipe.
 * @param chestInfos       Resolved chest loot table data (pass [] to exclude).
 * @param ownedItems       Player's owned-items dictionary.
 * @param allGearItems     Item detail registry used to check item types.
 */
export function computeNewItems(
  dropItemInfoMap: Record<string, DropItemInfo>,
  chestInfos: ChestDropMap[],
  ownedItems: Record<string, unknown>,
  allGearItems: Record<string, { type: string }>,
): NewItemEntry[] {
  const candidates: [string, DropItemInfo][] = [
    ...Object.entries(dropItemInfoMap),
    ...chestInfos.flatMap(({ dropInfoMap }) => Object.entries(dropInfoMap)),
  ];

  const seen = new Set<string>();
  const result: NewItemEntry[] = [];

  for (const [id, info] of candidates) {
    if (seen.has(id)) continue;
    seen.add(id);

    if (!isNewItemCandidate(id, info, allGearItems)) continue;
    if (isOwned(id, info, ownedItems)) continue;

    result.push({ id, icon: info.icon, stepsPerItem: info.stepsPerItem });
  }

  return result;
}

/**
 * Computes the harmonic-mean combined steps to get *any* new item.
 *
 * For two items with steps a and b:
 *   combinedSteps = 1 / (1/a + 1/b)
 *
 * Returns 0 when the list is empty.
 */
export function computeStepsPerAnyNewItem(items: NewItemEntry[]): number {
  if (items.length === 0) return 0;
  const rateSum = items.reduce((sum, { stepsPerItem }) => sum + 1 / stepsPerItem, 0);
  return 1 / rateSum;
}
