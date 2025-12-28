<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/store/settings";
import useBaseContext from "@/composables/useBaseContext";
import { useLootTables } from "@/composables/useLootTables";
import DropItemDisplay from "./DropItemDisplay.vue";
import LootTableDisplay from "./LootTableDisplay.vue";

const ctx = useBaseContext();

const settingsStore = useSettingsStore();
const { activitySettings } = storeToRefs(settingsStore);
const { filteredLootTables } = useLootTables(ctx);

const mapLootTable = (table) => {
  const { rollAmount, rollChance, slot, type, tableSource, stat } = table;
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
        stat,
        type,
        tableSource,
        rollChance,
      };
    });
  });
};

const combinedItems = computed(() => {
  const allItems = filteredLootTables.value.flatMap((table) => {
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
  for (const table of filteredLootTables.value) {
    const key = `${table.type}-${table.rollAmount}-${table.tableSource}`;
    if (!grouped[key]) {
      // Create a deep copy of the table to avoid mutation
      grouped[key] = {
        ...table,
        tables: [...table.tables],
      };
    } else {
      if (table.stat) {
        // if table comes from stat (item):
        // Combine rollChance values (capped at 1) instead of adding more tables
        const combinedRollChance = Math.min(
          1,
          grouped[key].rollChance + table.rollChance
        );
        grouped[key] = {
          ...grouped[key],
          rollChance: combinedRollChance,
        };
      } else {
        // if table comes from activity:
        // group tables e.g. collectibles
        grouped[key] = {
          ...grouped[key],
          tables: [...grouped[key].tables, ...table.tables],
        };
      }
    }
  }
  return Object.values(grouped);
});
</script>

<template>
  <details open>
    <summary>Drops</summary>
    <div v-if="ctx.embargoedActivities.value.has(ctx.source.value.id)">
      Info hidden during wiki embargo
    </div>
    <div v-else>
      <div class="options">
        <label v-if="activitySettings.showCombined.display === 1">
          <input
            type="checkbox"
            v-model="activitySettings.showCombined.value"
          />
          Show combined drops
        </label>
        <label v-if="activitySettings.hideOwnedCollectibles.display === 1">
          <input
            type="checkbox"
            v-model="activitySettings.hideOwnedCollectibles.value"
          />
          Hide owned collectibles
        </label>
      </div>
      <section class="drops-info">
        <template v-if="activitySettings.showCombined.value">
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
    </div>
  </details>
</template>

<style lang="scss" scoped>
.options {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: $md;

  label {
    display: flex;
    align-items: center;
    gap: $sm;
  }
}

.drops-info {
  border-radius: $md;
  display: flex;
  flex-wrap: wrap;

  align-items: flex-start;
  gap: $md;

  border: 1px solid $boxDarkOutline;
}
</style>
