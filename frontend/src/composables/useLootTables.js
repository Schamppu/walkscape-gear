import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import { getCtxLootTables, normalizeLootTable } from "@/utils/lootTables";

export function useLootTables(ctx) {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();
  const settingsStore = useSettingsStore();
  const { activitySettings } = storeToRefs(settingsStore);

  const lootTables = computed(() => getCtxLootTables(ctx));
  const lootTableIds = computed(() =>
    lootTables.value.map(({ tables }) => tables)
  );

  watch(
    lootTableIds,
    (ids) => {
      dataStore.fetchDetailedLootTables(ids);
    },
    { immediate: true }
  );

  const detailedLootTables = computed(() => {
    return lootTables.value.flatMap((table) => ({
      ...table,
      rollChance: table.rollChance || 1,
      tables: normalizeLootTable(
        table.tables.map(dataStore.getDetailedLootTable).filter(Boolean)
      ),
    }));
  });

  const filteredLootTables = computed(() => {
    const hideOwnedCollectibles =
      activitySettings.value.hideOwnedCollectibles.value;

    if (!hideOwnedCollectibles) {
      return detailedLootTables.value;
    }

    return detailedLootTables.value.filter((table) => {
      if (hideOwnedCollectibles && table.type.includes("collectible")) {
        const id = table.tables?.[0]?.tableRows?.[0]?.rowItemID || null;
        return (
          id in itemsStore.ownedCollectibles &&
          !itemsStore.ownedCollectibles[id]
        );
      }
      return table.tables.some((t) => t.tableRows.length > 0);
    });
  });

  return { lootTables, detailedLootTables, filteredLootTables };
}
