<script setup>
import { ref, onMounted, computed } from "vue";
import { getStats } from "@/utils/axios/api_routes";
import LoadingThrobber from "@/components//common/LoadingThrobber.vue";
import StatDisplay from "./StatDisplay.vue";
import { useEffectiveAttrs } from "@/utils/useEffectiveAttrs";

const loading = ref(true);
const stats = ref([]);
const statOrder = ref([]);

onMounted(async () => {
  const { data: statList } = await getStats();
  const filteredStats = ["skillLevel", "travelingDistance"];
  stats.value = statList.filter(({ type }) => !filteredStats.includes(type));
  statOrder.value = stats.value.map(({ id }) => id);
  loading.value = false;
});

const { allAttrs } = useEffectiveAttrs();

const includedStats = computed(() => {
  const attrStats = allAttrs.value.map(({ stats }) => stats[0]);
  return stats.value
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
    <loading-throbber v-if="loading" />
    <stat-display
      v-else
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