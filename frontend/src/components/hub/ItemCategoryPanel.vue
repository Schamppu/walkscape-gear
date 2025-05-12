<script setup>
import { computed } from "vue";
import { useItemsStore } from "@/store/items";
import ItemEntry from "./ItemEntry.vue";

const props = defineProps({
  title: String,
  qualities: Number,
  itemCategory: String,
  isOpen: Boolean,
});

const emit = defineEmits(["toggle"]);

const qualityOrder = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "ethereal",
];

const qualityRank = Object.fromEntries(
  qualityOrder.map((q, index) => [q, index])
);

function sortItems(items) {
  return items.slice().sort((a, b) => {
    const aRank = qualityRank[a.quality] ?? Infinity;
    const bRank = qualityRank[b.quality] ?? Infinity;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return a.name.localeCompare(b.name);
  });
}

const itemStore = useItemsStore();
const items = sortItems(itemStore.itemsByCategory[props.itemCategory]);
</script>

<template>
  <div class="category-panel">
    <div class="header" @click="emit('toggle')">
      <h3>{{ title }}</h3>
      <span>{{ isOpen ? "▲" : "▼" }}</span>
    </div>
    <div v-show="isOpen" class="content">
      <item-entry
        v-for="item in items"
        :key="item.id"
        :item="item"
        :qualities="qualities || 0"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  background: variables.$boxPrimaryBackground;

  border: 1px solid variables.$bgPrimary;
  padding: variables.$xxs;
  color: white;
}

.content {
  display: flex;
  flex-direction: column;
  gap: variables.$xxxs;

  background: variables.$boxDarkOutline;
  padding: variables.$xxxxs;
}
</style>
