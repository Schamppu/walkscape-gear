<script setup>
import { computed, ref, watch } from "vue";
import { useItemsStore } from "@/store/items";
import ItemEntry from "./ItemEntry.vue";

const props = defineProps({
  title: String,
  qualities: Number,
  itemCategory: String,
  isOpen: Boolean,
});

const emit = defineEmits(["toggle"]);
const hasLoaded = ref(false);

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

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && !hasLoaded.value) {
      hasLoaded.value = true;
    }
  }
);
</script>

<template>
  <div class="category-panel" :id="title">
    <div class="header" @click="emit('toggle')">
      <h3>{{ title }}</h3>
      <span>{{ isOpen ? "▲" : "▼" }}</span>
    </div>
    <div v-show="isOpen" class="content">
      <div v-if="hasLoaded">
        <item-entry
          v-for="item in items"
          :key="item.id"
          :item="item"
          :qualities="qualities || 0"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

.header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  background: $boxDarkBackground;

  border: 1px solid $bgPrimary;
  padding: $xxs;
  color: white;
}

.content {
  display: flex;
  flex-direction: column;
  gap: $xxxs;

  padding: $xxxxs;
}
</style>
