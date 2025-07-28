<script setup>
import { computed, ref, watchEffect } from "vue";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useGearStore } from "@/store/gear";
import { sumAttrs } from "@/utils/qualityAttrs";
import DropItemDisplay from "./DropItemDisplay.vue";
import LootTableDisplay from "./LootTableDisplay.vue";

const activityStore = useActivityStore();
const dataStore = useDataStore();
const gearStore = useGearStore();
const resolvedLootTables = ref([]);

watchEffect(async () => {
  const gearLootTables = gearStore.filledGearSlots.flatMap(([slot, item]) => {
    const attrs = sumAttrs(
      item.itemAttrs,
      item.itemQualityAttrs,
      item.buffs,
      item.quality
    )
      .filter((item) => Array.isArray(item.tables) && item.tables.length > 0)
      .flatMap(({ tables, stats }) => {
        return tables.map((table) => {
          return {
            ...table,
            tableSource: item.name,
            slot,
            rollChance: stats?.[0]?.value || 1,
          };
        });
      });
    return attrs;
  });

  const source = activityStore.activitySelected
    ? activityStore.activity
    : activityStore.recipe;
  const { tables: activityTables, name } = source;
  let activityLootTables = [];
  if (activityTables) {
    activityLootTables = activityTables.map((table) => {
      return {
        ...table,
        tableSource: `activity-${name}`,
      };
    });
  }

  const tables = [...activityLootTables, ...gearLootTables];
  const tableIds = tables.flatMap(({ tables }) => tables);
  await dataStore.fetchDetailedLootTables(tableIds);

  const resolvedTables = tables.flatMap((table) => {
    return {
      ...table,
      rollChance: table.rollChance || 1,
      tables: table.tables.map(dataStore.getDetailedLootTable),
    };
  });

  resolvedLootTables.value = resolvedTables;
});

const mapLootTable = (table) => {
  const { rollAmount, rollChance, slot, type, tableSource } = table;
  return table.tables?.flatMap(({ noDropChance, tableRows }) => {
    const mappedRows = tableRows.map((row) => {
      return {
        ...row,
        noDropChance,
      };
    });
    const tableWeight = mappedRows.reduce((acc, row) => {
      return acc + (row.rowWeight || 0);
    }, 0);
    return mappedRows.map((row) => {
      return {
        ...row,
        tableWeight,
        rollAmount,
        slot,
        type,
        tableSource,
        rollChance,
      };
    });
  });
};

const combinedItems = computed(() => {
  const allItems = resolvedLootTables.value.flatMap((table) => {
    return mapLootTable(table) || [];
  });

  const seen = new Set();
  const uniqueItems = allItems.filter((item) => {
    const itemId = item.isMoney ? "gold" : item.rowItemID;
    const key = `${itemId}::${item.tableSource}::${item.slot}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const grouped = {};
  for (const item of uniqueItems) {
    const key = item.isMoney ? "gold" : item.rowItemID;
    if (!key) continue;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  return Object.values(grouped);
});

const groupedLootTables = computed(() => {
  const grouped = {};
  for (const table of resolvedLootTables.value) {
    const key = `${table.type}-${table.rollAmount}-${table.tableSource}`;
    if (!grouped[key]) {
      grouped[key] = table;
    } else {
      grouped[key]["tables"].push.apply(grouped[key]["tables"], table.tables);
    }
  }
  return Object.values(grouped);
});
</script>

<template>
  <details open>
    <summary>Drops</summary>
    <div style="margin-bottom: 1em">
      <label>
        <input type="checkbox" v-model="activityStore.showCombined" />
        Show combined drops
      </label>
    </div>
    <section class="drops-info">
      <template v-if="activityStore.showCombined">
        <drop-item-display
          v-for="(items, index) in combinedItems"
          :key="index"
          :sources="items"
        />
      </template>
      <template v-else>
        <loot-table-display
          v-for="(table, index) in groupedLootTables"
          :key="index"
          :loot-table="table"
        />
      </template>
    </section>
  </details>
</template>

<style lang="scss" scoped>
.drops-info {
  border-radius: $md;
  display: flex;
  flex-wrap: wrap;

  align-items: flex-start;
  gap: $md;

  border: 1px solid $boxDarkOutline;
}
</style>
