<script setup>
import { computed } from "vue";
import StatDisplay from "./StatDisplay.vue";
import { useDataStore } from "@/store/data";
import { useEffectiveAttrs } from "@/utils/useEffectiveAttrs";

const { allAttrs } = useEffectiveAttrs();
const dataStore = useDataStore();

const includedStats = computed(() => {
  const attrStats = allAttrs.value.map(({ stats }) => stats[0]);
  return dataStore.stats
    .flatMap((stat) => {
      return [
        { stat, isPercent: true },
        { stat, isPercent: false },
      ];
    })
    .filter(({ stat, isPercent }) => {
      return attrStats.some(
        (stats) => stats.isPercent === isPercent && stats.type === stat.type
      );
    });
});
</script>

<template>
  <section class="stats">
    <stat-display
      v-for="({ stat, isPercent }, index) in includedStats"
      :key="index"
      :stat="stat"
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
