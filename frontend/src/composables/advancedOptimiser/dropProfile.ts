import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { resolveLootTableWeights } from "@/domain/lootTables/lootTables";
import {
  deduplicateAndGroupDrops,
  filterDetailedTables,
  resolveSourceContextTables,
} from "@/domain/lootTables/contextTables";
import { buildDropItemInfoMap } from "@/domain/lootTables/dropInfo";
import { tokenValues } from "@/domain/constants/tokenValues";
import { buildDropProfile, type DropProfile } from "@/domain/advancedOptimiser/targets";
import type { DetailedLootTable } from "@/domain/types/lootTable";
import type { LootTableRef } from "@/domain/types/common";

/**
 * Chest and token rates per reward roll for the activity's own loot tables
 * (gear-added tables aren't included). Uses the same pipeline as the drops
 * panel (`useLootTables`), with one step per roll and no find bonuses.
 *
 * Reads detailed loot tables already fetched by `useLootTables`.
 */
export const buildSourceDropProfile = (
  source: { name: string; tables?: LootTableRef[] | null } | null,
): DropProfile => {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();
  const playerStore = usePlayerStore();

  const tables = resolveSourceContextTables(
    source ? { name: source.name, tables: source.tables ?? undefined } : null,
  ).map((table) => ({
    ...table,
    rollChance: table.rollChance || 1,
    tables: resolveLootTableWeights(
      table.tables
        .map(dataStore.getDetailedLootTable)
        .filter((t): t is NonNullable<typeof t> => t !== null) as DetailedLootTable[],
      (skill: string) => playerStore.skillLevels[skill] ?? 1,
    ),
  }));

  const drops = deduplicateAndGroupDrops(filterDetailedTables(tables, false, []));
  const dropInfo = buildDropItemInfoMap(
    drops,
    1,
    1,
    () => 1,
    itemsStore.fineMaterials,
    playerStore.skillsMap,
  );
  return buildDropProfile(dropInfo, itemsStore.containers, tokenValues);
};
