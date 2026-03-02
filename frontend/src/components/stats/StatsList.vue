<script setup>
import { computed } from "vue";
import StatDisplay from "./StatDisplay.vue";
import { useDataStore } from "@/store/data";
import { injectEffectiveAttrs } from "@/composables/context/injectShared";

const { allAttrs } = injectEffectiveAttrs();
const dataStore = useDataStore();

const includedStats = computed(() => {
  const attrStats = allAttrs.value.map(({ stats }) => stats[0]);
  const regularStats = dataStore.stats
    .flatMap((stat) => {
      return [
        { stat, isPercent: true },
        { stat, isPercent: false },
      ];
    })
    .filter(({ stat, isPercent }) => {
      return attrStats.some(
        (stats) => stats.isPercent === isPercent && stats.type === stat.type,
      );
    });

  const regularStatIds = dataStore.stats.map(({ id }) => id);
  const pseudoStats = allAttrs.value
    .filter(({ stats }) => {
      return stats.some((stat) => !regularStatIds.includes(stat.stat));
    })
    .map(({ stats, customIcon }) => {
      const { name, stat, isPercent } = stats[0];
      return {
        stat: { name, id: stat, type: stat, icon: customIcon },
        isPercent,
      };
    })
    .filter((item, index, array) => {
      return (
        index ===
        array.findIndex(
          (other) =>
            other.stat.id === item.stat.id &&
            other.isPercent === item.isPercent,
        )
      );
    });

  return regularStats.concat(pseudoStats);
});
</script>

<template>
  <section class="stats">
    <stat-display
      v-for="{ stat, isPercent } in includedStats"
      :key="`${stat.id}-${isPercent}`"
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
