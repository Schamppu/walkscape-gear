<script setup>
import { computed, ref, watchEffect } from "vue";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useRequirements } from "@/utils/useRequirements";
import { sumAttrs } from "@/utils/qualityAttrs";
import DropItemDisplay from "./DropItemDisplay.vue";
import LootTableDisplay from "./LootTableDisplay.vue";

const activityStore = useActivityStore();
const dataStore = useDataStore();
const gearStore = useGearStore();
const itemsStore = useItemsStore();
const { checkRequirements } = useRequirements();
const resolvedLootTables = ref([]);

watchEffect(async () => {
  const gearLootTables = gearStore.filledGearSlots.flatMap(([slot, item]) => {
    const attrs = sumAttrs(
      item.itemAttrs,
      item.itemQualityAttrs,
      item.buffs,
      item.quality
    )
      .filter(
        (item) =>
          Array.isArray(item.tables) &&
          item.tables.length > 0 &&
          checkRequirements(item.requirements)
      )
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

const filteredLootTables = computed(() => {
  if (!activityStore.hideOwnedCollectibles) {
    return resolvedLootTables.value;
  }

  return resolvedLootTables.value.filter((table) => {
    if (
      activityStore.hideOwnedCollectibles &&
      table.type.includes("collectible")
    ) {
      const id = table.tables?.[0]?.tableRows?.[0]?.rowItemID || null;
      return (
        id in itemsStore.ownedCollectibles && !itemsStore.ownedCollectibles[id]
      );
    }
    return table.tables.some((t) => t.tableRows.length > 0);
  });
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
      // Create a new array instead of mutating the existing one
      grouped[key] = {
        ...grouped[key],
        tables: [...grouped[key].tables, ...table.tables],
      };
    }
  }
  return Object.values(grouped);
});
</script>

<template>
  <details open>
    <summary>Drops</summary>
    <div class="options">
      <label>
        <input type="checkbox" v-model="activityStore.showCombined" />
        Show combined drops
      </label>
      <label>
        <input type="checkbox" v-model="activityStore.hideOwnedCollectibles" />
        Hide owned collectibles
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
