<script setup lang="ts">
import { computed } from "vue";
import StatDisplay from "./StatDisplay.vue";
import { useDataStore } from "@/store/data";
import { injectEffectiveAttrs } from "@/composables/context/injectShared";
import { buildStatsList } from "@/domain/stats/statsList";

const { allAttrs } = injectEffectiveAttrs();
const dataStore = useDataStore();

const includedStats = computed(() =>
  buildStatsList(allAttrs.value, dataStore.stats),
);
</script>

<template>
  <section class="stats">
    <stat-display
      v-for="{ stat, isPercent, data } in includedStats"
      :key="`${stat.id}-${isPercent}`"
      :stat="stat"
      :data="data"
      :isPercent="isPercent"
    />
  </section>
</template>

<style lang="scss" scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: $md;
  border-radius: $sm;
}
</style>
