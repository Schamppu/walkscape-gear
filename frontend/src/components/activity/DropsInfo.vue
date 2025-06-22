<script setup>
import { onMounted, ref } from "vue";
import { getMultipleLootTables } from "@/utils/axios/api_routes";
import LootTableDisplay from "./LootTableDisplay.vue";

const props = defineProps({
  activity: Object,
});

const resolvedLootTables = ref([]);

onMounted(async () => {
  const tables = props.activity?.tables || [];
  const tableIds = tables.flatMap(({ tables }) => tables);

  const { data: lootTables } = await getMultipleLootTables(tableIds);
  const lootTablesMap = new Map(lootTables.map((table) => [table.id, table]));
  const resolvedTables = tables.flatMap((table) => {
    return {
      ...table,
      tables: table.tables.map((id) => lootTablesMap.get(id)),
    };
  });

  resolvedLootTables.value = resolvedTables;
});
</script>

<template>
  <details open>
    <summary>Drops</summary>
    <section class="drops-info">
      <loot-table-display
        v-for="(table, index) in resolvedLootTables"
        :key="index"
        :loot-table="table"
      />
    </section>
  </details>
</template>

<style lang="scss" scoped>
.drops-info {
  border-radius: $md;
  display: flex;
  flex-wrap: wrap;

  align-items: flex-start;
  gap: $lg;

  border: 1px solid $boxDarkOutline;
}
</style>
