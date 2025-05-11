<script setup>
import { ref } from "vue";
import { useItemsStore } from "@/store/items";
import {
  getCollectibles,
  getCrafted,
  getLoot,
  getChestLootTables,
} from "@/utils/axios/routes";
import ItemCategoryPanel from "./ItemCategoryPanel.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";
import { capitalize } from "@/utils/string.js";
import {
  resolveChestCategories,
  misc_loot,
  crafted_categories,
  misc_crafted,
} from "./itemCategories.js";

const isLoading = ref(true);
const openCategory = ref(null);
const resolvedCategories = ref([]);
const itemsStore = useItemsStore();

const fetchConfigs = [
  { method: getCollectibles, key: "collectibles" },
  { method: getCrafted, key: "crafted" },
  { method: getLoot, key: "loot" },
  { method: getChestLootTables, key: "chest_tables" },
];

Promise.all(
  fetchConfigs.map(({ method, key }) =>
    method().then(({ data }) => itemsStore.setItems(key, data))
  )
).then(() => {
  // All loaded – show content

  const loot = itemsStore.itemsByCategory["loot"];
  const chestTables = itemsStore.itemsByCategory["chest_tables"];

  const chestCategories = resolveChestCategories(loot, chestTables);
  categories.push(...chestCategories);
  categories.push(misc_loot);
  categories.push(...crafted_categories);
  categories.push(misc_crafted);
  resolveCategories();

  isLoading.value = false;
});

const categories = [
  {
    title: "Collectibles",
    key: "collectibles",
    source: "collectibles",
    filter: () => true,
  },
];

const resolveCategories = () => {
  const matchedItemIds = new Set();

  const resolved = categories.map((cat) => {
    const items = itemsStore.itemsByCategory[cat.source] || [];

    let filtered = [];
    if (cat.filter) {
      filtered = items.filter((item) => {
        const isMatch = cat.filter(item);
        if (isMatch) matchedItemIds.add(item.id);
        return isMatch;
      });
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));
    itemsStore.setItems(cat.key, filtered);
    return { ...cat, items: filtered };
  });

  // Handle miscellaneous categories
  for (const cat of resolved) {
    if (!cat.filter) {
      const items = itemsStore.itemsByCategory[cat.source] || [];
      const filtered = items.filter((item) => !matchedItemIds.has(item.id));
      itemsStore.setItems(cat.key, filtered);
      console.log(filtered);
    }
  }

  resolvedCategories.value = resolved;
};

function toggleCategory(category) {
  openCategory.value = openCategory.value === category ? null : category;
}
</script>

<template>
  <div class="wrapper">
    <h2 class="typography-h3">Owned Items</h2>
    <div v-if="isLoading">
      <loading-throbber />
    </div>
    <div v-else class="categories">
      <item-category-panel
        v-for="cat in resolvedCategories"
        :key="cat.title"
        :title="cat.title"
        :display="cat.display"
        :item-category="cat.key"
        :is-open="openCategory === cat.title"
        @toggle="() => toggleCategory(cat.title)"
      />
    </div>
  </div>
</template>

<style langs="scss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.categories {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>