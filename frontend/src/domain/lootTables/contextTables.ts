/**
 * Purpose:
 * Pure functions for assembling, filtering, deduplicating, and grouping
 * context loot tables from gear attributes and activity/recipe sources.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores or global state.
 * - Mutate inputs.
 */

import { usedAttrs } from "@/domain/quality/qualityAttrs";
import { stripHtmlTags } from "@/utils/stripHtmlTags";
import { mapTableToItems } from "@/domain/lootTables/lootTables";
import type { GearItem, PetItem, Attribute } from "@/domain/types/item";
import type { LootTableRef, Requirement } from "@/domain/types/common";
import type {
  ContextLootTable,
  DetailedContextLootTable,
  MappedTableRow,
} from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Source context tables
// ---------------------------------------------------------------------------

/**
 * Builds `ContextLootTable` entries directly from an activity or recipe source.
 */
export function resolveSourceContextTables(
  source: { name: string; tables?: LootTableRef[] } | null,
): ContextLootTable[] {
  if (!source?.tables) return [];
  return source.tables.map((table) => ({
    ...table,
    tableSource: `activity-${source.name}`,
    rollChance: 1,
  }));
}

// ---------------------------------------------------------------------------
// Gear context tables
// ---------------------------------------------------------------------------

/**
 * Derives `ContextLootTable` entries from equipped gear attributes.
 * Only attributes that pass `checkRequirements` and carry loot table refs
 * are included.
 *
 * @param filledGearSlots  Non-null `[slotName, item]` pairs from the gear set.
 * @param checkRequirements  Framework-injected predicate; returns `true` when
 *                           all the attribute's requirements are satisfied.
 */
export function resolveGearContextTables(
  filledGearSlots: [string, (GearItem | PetItem) & { quality: string | null }][],
  checkRequirements: (reqs: Requirement[]) => boolean,
): ContextLootTable[] {
  return filledGearSlots.flatMap(([slot, item]) =>
    usedAttrs(item, item.quality ?? "common")
      .filter(
        (attr: Attribute) =>
          Array.isArray(attr.tables) &&
          (attr.tables as LootTableRef[]).length > 0 &&
          checkRequirements(attr.requirements),
      )
      .flatMap((attr: Attribute) => {
        const { stats, customText } = attr;
        const tableSource =
          stripHtmlTags(customText) ||
          (attr as Attribute & { name?: string }).name ||
          attr.text;
        return (attr.tables as LootTableRef[]).map((table) => ({
          ...table,
          tableSource,
          slot,
          stat: customText,
          rollChance: stats?.[0]?.value || 1,
        }));
      }),
  );
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filters resolved loot tables according to the "hide owned collectibles"
 * setting. When the setting is off the list is returned unchanged.
 */
export function filterDetailedTables(
  tables: DetailedContextLootTable[],
  hideOwnedCollectibles: boolean,
  ownedCollectibleIds: string[],
): DetailedContextLootTable[] {
  if (!hideOwnedCollectibles) return tables;

  return tables.filter((table) => {
    if (table.type.includes("collectible")) {
      const id = table.tables?.[0]?.tableRows?.[0]?.rowItemID ?? null;
      return id === null || !ownedCollectibleIds.includes(id);
    }
    return table.tables.some((t) => t.tableRows.length > 0);
  });
}

// ---------------------------------------------------------------------------
// Deduplication and drop-row grouping
// ---------------------------------------------------------------------------

/**
 * Flattens `DetailedContextLootTable` rows, removes exact duplicates
 * (same item × same source × same slot), and groups the remaining rows
 * by item id into arrays ready for per-item drop calculations.
 */
export function deduplicateAndGroupDrops(
  tables: DetailedContextLootTable[],
): MappedTableRow[][] {
  const allItems = tables.flatMap((table) => mapTableToItems(table));

  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = `${item.isMoney ? "gold" : item.rowItemID}::${item.tableSource}::${item.slot}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const grouped: Record<string, MappedTableRow[]> = {};
  for (const item of unique) {
    const key = item.isMoney ? "gold" : item.rowItemID;
    if (!key) continue;
    (grouped[key] ??= []).push(item);
  }

  return Object.values(grouped);
}

// ---------------------------------------------------------------------------
// Table group merging
// ---------------------------------------------------------------------------

/**
 * Merges `DetailedContextLootTable` entries that share the same type +
 * rollAmount + tableSource key:
 * - Stat-sourced (gear) tables: combined roll chances, capped at 1.
 * - Activity-sourced tables: sub-tables concatenated.
 */
export function mergeTableGroups(
  tables: DetailedContextLootTable[],
): DetailedContextLootTable[] {
  const grouped: Record<string, DetailedContextLootTable> = {};

  for (const table of tables) {
    const key = `${table.type}-${table.rollAmount}-${table.tableSource}`;

    if (!grouped[key]) {
      grouped[key] = { ...table, tables: [...table.tables] };
    } else if (table.stat) {
      grouped[key] = {
        ...grouped[key],
        rollChance: Math.min(1, grouped[key].rollChance + table.rollChance),
      };
    } else {
      grouped[key] = {
        ...grouped[key],
        tables: [...grouped[key].tables, ...table.tables],
      };
    }
  }

  return Object.values(grouped);
}
