<script setup>
import { computed } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  item: Object,
  rollAmount: Number,
  totalWeight: Number,
  type: Array,
});

const dropChance = computed(() => {
  const { rowWeight, noDropChance } = props.item;
  const odds = (1 - noDropChance) * (rowWeight / props.totalWeight);
  return Math.round(odds * 100000) / 1000;
});
</script>

<template>
  <div class="drop-item-display" :title="item.name" :aria-label="item.name">
    <ws-icon :icon-path="item.icon" size="md" />
    <span>{{ dropChance }}%</span>

    <span v-if="item.rowMinimumAmount !== item.rowMaximumAmount"
      >{{ item.rowMinimumAmount }} - {{ item.rowMaximumAmount }}</span
    >
    <span v-else>{{ item.rowMinimumAmount }}</span>
  </div>
</template>

<style lang="scss" scoped>
.drop-item-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  font-size: 0.75rem;
}
</style>
