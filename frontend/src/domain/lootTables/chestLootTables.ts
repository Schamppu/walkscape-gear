/**
 * Purpose:
 * Pure calculation functions for resolving the contents of chest (container)
 * items dropped by activities.
 *
 * Each chest rolls its loot table CHEST_ROLLS times on opening.
 * Fine material chance is fixed at CHEST_FINE_CHANCE regardless of the
 * player's fine-material-find stat.
 * Chest loot tables have no requirementsBonuses (no weight scaling needed).
 * Chests cannot drop pet eggs (no rare tier calculation).
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores or global state.
 * - Mutate inputs.
 */

import type { LootTableDetail, LootTableRow } from "@/domain/types/lootTable";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CHEST_ROLLS = 4;
export const CHEST_FINE_CHANCE = 1 / 100;

/** Per-roll probability that the main table is used. */
export const CHEST_MAIN_CHANCE = 0.5;
/** Per-roll probability that a sub-table is selected. */
export const CHEST_SUB_CHANCE = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChestItem = {
  chestItemId: string;
  stepsPerChest: number;
};

// ---------------------------------------------------------------------------
// Identification
// ---------------------------------------------------------------------------

/**
 * Returns all items in the drop info map that are containers (chests).
 */
export function identifyChestItems(
  dropItemInfoMap: Record<string, DropItemInfo>,
  containers: Record<string, unknown>,
): ChestItem[] {
  return Object.entries(dropItemInfoMap)
    .filter(([id]) => id in containers)
    .map(([id, info]) => ({ chestItemId: id, stepsPerChest: info.stepsPerItem }));
}

// ---------------------------------------------------------------------------
// Drop info map construction
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Processes a set of table rows and adds DropItemInfo entries to the map.
 * `rollChancePerRow` is the per-row probability per single chest-roll
 * (already accounts for table-level noDropChance or sub-table weight).
 */
function processRows(
  rows: LootTableRow[],
  perRollProbabilityFactor: number,
  stepsPerChest: number,
  fineMaterialIds: Record<string, boolean>,
  out: Map<string, DropItemInfo>,
): void {
  const tableWeight = rows.reduce((sum, row) => sum + (row.rowWeight ?? 0), 0);
  if (tableWeight === 0) return;

  for (const row of rows) {
    const id = row.isMoney ? "gold" : row.rowItemID;
    if (!id) continue;

    const rollChance = perRollProbabilityFactor * (row.rowWeight / tableWeight);
    const effectiveChance = 1 - Math.pow(1 - rollChance, CHEST_ROLLS);
    if (effectiveChance === 0) continue;

    const avgAmount = (row.rowMinimumAmount + row.rowMaximumAmount) / 2;
    const stepsPerItem = stepsPerChest / (effectiveChance * avgAmount);

    const canBeFine = !row.isMoney && id in fineMaterialIds;
    const stepsPerFine = canBeFine ? stepsPerItem / CHEST_FINE_CHANCE : 0;
    const stepsPerNormal = canBeFine ? stepsPerItem / (1 - CHEST_FINE_CHANCE) : stepsPerItem;

    const info: DropItemInfo = {
      id,
      icon: row.icon,
      sources: [],
      totalDropChance: effectiveChance * 100,
      stepsPerItem,
      itemsPerStep: 1000 / stepsPerItem,
      stepsPerNormal,
      stepsPerFine,
      stepsPerRare: 0,
      dropCounts:
        row.rowMinimumAmount === row.rowMaximumAmount
          ? `${row.rowMinimumAmount}`
          : `${row.rowMinimumAmount}-${row.rowMaximumAmount}`,
      variableRequirement: null,
    };

    // If the same item appears in multiple tables, combine drop rates (harmonic).
    const existing = out.get(id);
    if (existing) {
      const combinedStepsPerItem =
        1 / (1 / existing.stepsPerItem + 1 / info.stepsPerItem);
      const combinedChance = existing.totalDropChance + info.totalDropChance;
      const combinedCanBeFine = canBeFine || existing.stepsPerFine > 0;
      const combinedStepsPerFine = combinedCanBeFine
        ? combinedStepsPerItem / CHEST_FINE_CHANCE
        : 0;
      const combinedStepsPerNormal = combinedCanBeFine
        ? combinedStepsPerItem / (1 - CHEST_FINE_CHANCE)
        : combinedStepsPerItem;
      out.set(id, {
        ...existing,
        totalDropChance: combinedChance,
        stepsPerItem: combinedStepsPerItem,
        itemsPerStep: 1000 / combinedStepsPerItem,
        stepsPerNormal: combinedStepsPerNormal,
        stepsPerFine: combinedStepsPerFine,
      });
    } else {
      out.set(id, info);
    }
  }
}

// ---------------------------------------------------------------------------
// Drop info map construction
// ---------------------------------------------------------------------------

/**
 * Builds a `Record<itemId, DropItemInfo>` for the items inside a chest.
 *
 * Each roll has a hardcoded CHEST_MAIN_CHANCE (50%) chance of hitting the main
 * table and a CHEST_SUB_CHANCE (50%) chance of picking a sub-table. Which
 * sub-table is selected is determined by normalising its weight against the
 * total weight of all sub-tables. If the selected sub-table has no rows (e.g.
 * an ethereal placeholder) the roll falls back to the main table.
 *
 * When there are no sub-tables the main table receives all rolls (factor = 1).
 *
 * Fine handling uses a fixed CHEST_FINE_CHANCE (not the player's stat).
 * Items appearing in multiple tables have their drop rates combined harmonically.
 *
 * @param stepsPerChest    Steps to obtain the chest from the activity.
 * @param chestTables      Full LootTableDetail entries from the chest item.
 * @param fineMaterialIds  Set of item ids that can drop as fine.
 */
export function buildChestDropInfoMap(
  stepsPerChest: number,
  chestTables: LootTableDetail[],
  fineMaterialIds: Record<string, boolean>,
): Record<string, DropItemInfo> {
  const out = new Map<string, DropItemInfo>();

  for (const table of chestTables) {
    const allSubs = table.subTables ?? [];
    const totalSubWeight = allSubs.reduce((sum, sub) => sum + sub.weight, 0);

    let mainTableFactor: number;

    if (totalSubWeight === 0) {
      // No sub-tables (or all weight zero): every roll goes to the main table.
      mainTableFactor = 1;
    } else {
      // Empty sub-tables (no rows) fall back to the main table, adding their
      // share of the 50% sub-table probability back to the main table.
      const emptySubWeight = allSubs
        .filter((sub) => !sub.tableRows?.length)
        .reduce((sum, sub) => sum + sub.weight, 0);
      mainTableFactor = CHEST_MAIN_CHANCE + CHEST_SUB_CHANCE * (emptySubWeight / totalSubWeight);
    }

    if (table.tableRows.length > 0 && mainTableFactor > 0) {
      processRows(table.tableRows, mainTableFactor, stepsPerChest, fineMaterialIds, out);
    }

    if (totalSubWeight > 0) {
      for (const sub of allSubs) {
        if (!sub.tableRows?.length || sub.weight <= 0) continue;
        const subFactor = CHEST_SUB_CHANCE * (sub.weight / totalSubWeight);
        processRows(sub.tableRows, subFactor, stepsPerChest, fineMaterialIds, out);
      }
    }
  }

  return Object.fromEntries(out);
}
