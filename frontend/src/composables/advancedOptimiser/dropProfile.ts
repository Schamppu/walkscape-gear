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
import { buildCoinDrops, findGroupsOf, type FindGroup } from "@/domain/advancedOptimiser/coins";
import type { DetailedLootTable } from "@/domain/types/lootTable";
import type { LootTableRef } from "@/domain/types/common";

/**
 * Chest and token rates per reward roll for the activity's own loot tables
 * (gear-added tables aren't included). Chests are split by whether they come
 * from a `chestTable` table, the only ones chest find scales. Uses the same pipeline as the drops
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

  const perRollDropInfo = (selected: typeof tables) =>
    buildDropItemInfoMap(
      deduplicateAndGroupDrops(filterDetailedTables(selected, false, [])),
      1,
      1,
      () => 1,
      itemsStore.fineMaterials,
      playerStore.skillsMap,
    );

  // Coin value per group of tables that the same find bonuses scale.
  const groups = new Map<string, { finds: FindGroup[]; tables: typeof tables }>();
  for (const table of tables) {
    const finds = findGroupsOf(table.type);
    const key = finds.join("+");
    if (!groups.has(key)) groups.set(key, { finds, tables: [] });
    groups.get(key)!.tables.push(table);
  }
  const gearQuality = Object.fromEntries(
    Object.entries(itemsStore.allGearItems).map(([id, item]) => [id, item.quality]),
  );

  return {
    ...buildDropProfile(
      perRollDropInfo(tables),
      perRollDropInfo(tables.filter(({ type }) => type.includes("chestTable"))),
      itemsStore.containers,
      tokenValues,
    ),
    coins: {
      drops: buildCoinDrops(
        [...groups.values()].map(({ finds, tables: groupTables }) => ({
          finds,
          dropMap: perRollDropInfo(groupTables),
        })),
        gearQuality,
        dataStore.itemValues as unknown as Record<string, Record<string, number>>,
      ),
      recipe: null,
    },
  };
};
