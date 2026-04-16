<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import {
  injectBaseContext,
  injectLootTables,
} from "@/composables/context/injectShared";
import { useChestLootTables } from "@/composables/useChestLootTables";
import DropItemDisplay from "./DropItemDisplay.vue";
import LootTableDisplay from "./LootTableDisplay.vue";
import AggregateDrops from "./aggregate/AggregateDrops.vue";
import ChestLootTableSection from "./ChestLootTableSection.vue";

const ctx = injectBaseContext();

const settingsStore = useSettingsStore();
const { activitySettings } = storeToRefs(settingsStore);
const { groupedLootTables, dropItemInfoMap } = injectLootTables();

const itemsStore = useItemsStore();
const chestLootTables = useChestLootTables(dropItemInfoMap);

const showChests = computed(() => activitySettings.value.showChestLootTables?.value === true);

const visibleItemIds = computed(() => {
  const ids = Object.keys(dropItemInfoMap.value);
  if (!showChests.value) return ids;
  return ids.filter((id) => !(id in itemsStore.containers));
});

const visibleLootTables = computed(() => {
  if (!showChests.value) return groupedLootTables.value;
  return groupedLootTables.value.filter((t) => !t.type.includes("chestTable"));
});
</script>

<template>
  <details open>
    <summary>Drops</summary>
    <div v-if="ctx.embargoedActivities.value.has(ctx.source.value.id)">
      Info partially hidden during wiki embargo
    </div>
    <div>
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
      <aggregate-drops :chest-loot-tables="chestLootTables" />
      <section class="drops-info">
        <template v-if="activitySettings.showCombined.value">
          <drop-item-display
            v-for="item in visibleItemIds"
            :key="item"
            :item-id="item"
          />
        </template>
        <template v-else>
          <loot-table-display
            v-for="(table, index) in visibleLootTables"
            :key="index"
            :loot-table="table"
          />
        </template>
      </section>
      <section v-if="showChests && chestLootTables.length > 0" class="chest-sections">
        <chest-loot-table-section
          v-for="chestInfo in chestLootTables"
          :key="chestInfo.chestItemId"
          :chest-info="chestInfo"
        />
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

.chest-sections {
  display: flex;
  flex-direction: column;
  gap: $sm;
  margin-top: $sm;
}
</style>
