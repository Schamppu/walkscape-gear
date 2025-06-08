<script setup>
import { ref, onMounted, computed } from "vue";
import { getStats } from "@/utils/axios/api_routes";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { sumAttrs } from "@/utils/qualityAttrs";
import LoadingThrobber from "@/components//common/LoadingThrobber.vue";
import StatDisplay from "./StatDisplay.vue";

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

const gearStore = useGearStore();
const itemsStore = useItemsStore();
const activityStore = useActivityStore();
const playerStore = usePlayerStore();

const owned = itemsStore.ownedItems;

const allItems = computed(() => {
  if (!stats.value.length) return [];

  const ownedCollectibles =
    "collectibles" in itemsStore.itemsByCategory
      ? itemsStore.itemsByCategory["collectibles"].filter(
          ({ id }) => id in owned
        )
      : [];

  const items = [...ownedCollectibles, ...gearStore.filledGearSlots];
  return items;
});

const allAttrs = computed(() => {
  const itemAttrs = allItems.value
    .flatMap(({ itemAttrs, itemQualityAttrs, quality }) =>
      sumAttrs(itemAttrs, itemQualityAttrs, quality)
    )
    .filter(Boolean);
  return itemAttrs;
});

const attrsByStat = computed(() => {
  const grouped = {};
  for (const attr of allAttrs.value) {
    const [statObj] = attr.stats;
    const { stat: statId, isPercent } = statObj;

    if (!grouped[statId]) {
      const stat = stats.value.find(({ id }) => id === statId);

      grouped[statId] = {
        stat,
        true: [],
        false: [],
      };
    }

    grouped[statId][isPercent].push(attr);
  }
  return grouped;
});

const statKeys = computed(() =>
  Object.entries(attrsByStat.value)
    .flatMap(([id, { stat, false: flat, true: percent }]) => {
      return [
        {
          stat,
          attrs: flat,
          percent: false,
        },
        { id, stat, attrs: percent, percent: true },
      ].filter(({ attrs }) => attrs.length);
    })
    .sort((a, b) => {
      return (
        statOrder.value.indexOf(a.stat.id) - statOrder.value.indexOf(b.stat.id)
      );
    })
);

const data = computed(() => {
  return {
    activity: activityStore.activity,
    location: activityStore.location,
    achievementPoints: playerStore.achievementPoints,
    gear: gearStore.filledGearSlots,
  };
});
</script>

<template>
  <section class="stats">
    <loading-throbber v-if="loading" />
    <stat-display
      v-else
      v-for="{ id, stat, attrs, percent } in statKeys"
      :key="id"
      :stat="stat"
      :attrs="attrs"
      :is-percent="percent"
      :data="data"
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