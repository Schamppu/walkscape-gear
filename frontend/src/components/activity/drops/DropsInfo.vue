<script setup>
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/store/settings";
import {
  injectBaseContext,
  injectLootTables,
} from "@/composables/context/injectShared";
import DropItemDisplay from "./DropItemDisplay.vue";
import LootTableDisplay from "./LootTableDisplay.vue";
import AggregateDrops from "./AggregateDrops.vue";

const ctx = injectBaseContext();

const settingsStore = useSettingsStore();
const { activitySettings } = storeToRefs(settingsStore);
const { groupedLootTables, dropItemInfoMap } = injectLootTables();
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
      <aggregate-drops />
      <section class="drops-info">
        <template v-if="activitySettings.showCombined.value">
          <drop-item-display
            v-for="item in Object.keys(dropItemInfoMap)"
            :key="item"
            :item-id="item"
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
