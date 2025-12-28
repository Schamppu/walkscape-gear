import { computed, watch } from "vue";
import { useDataStore } from "@/store/data";
import { getCtxLootTables } from "@/utils/lootTables";

export function useLootTables(ctx) {
  const dataStore = useDataStore();
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
      tables: table.tables.map(dataStore.getDetailedLootTable).filter(Boolean),
    }));
  });

  return { lootTables, detailedLootTables };
}
