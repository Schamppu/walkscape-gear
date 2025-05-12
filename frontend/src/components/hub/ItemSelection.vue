<script setup>
import { ref } from "vue";
import { useItemsStore } from "@/store/items";
import {
  getCollectibles,
  getCrafted,
  getLoot,
  getActivityItems,
  getChestItems,
  getRewards,
  getAchievementRewards,
  getShops,
} from "@/utils/axios/routes";
import ItemCategoryPanel from "./ItemCategoryPanel.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";
import { capitalize } from "@/utils/string.js";
import {
  resolveActivityCategory,
  resolveRewardsCategories,
  resolveAchievementRewardCategory,
  resolveShopsCategory,
  resolveChestCategories,
  misc_loot,
  crafted_categories,
  misc_crafted,
} from "./itemCategories.js";

const isLoading = ref(true);
const openCategory = ref(null);
const groupedCategories = ref([]);
const itemsStore = useItemsStore();

const fetchConfigs = [
  { method: getCollectibles, key: "collectibles" },
  { method: getCrafted, key: "crafted" },
  { method: getLoot, key: "loot" },
  { method: getChestItems, key: "chest_tables" },
  { method: getActivityItems, key: "activity_items" },
  { method: getShops, key: "shops" },
  { method: getRewards, key: "rewards" },
  { method: getAchievementRewards, key: "achievement_rewards" },
];

Promise.all(
  fetchConfigs.map(({ method, key }) => {
    return method().then(({ data }) => itemsStore.setItems(key, data));
  })
).then(() => {
  // All loaded – show content

  const loot = itemsStore.itemsByCategory["loot"];
  const chestTables = itemsStore.itemsByCategory["chest_tables"];
  const activityItems = itemsStore.itemsByCategory["activity_items"];
  const shopsTable = itemsStore.itemsByCategory["shops"];
  const rewardItems = itemsStore.itemsByCategory["rewards"];
  const achievementRewardItems =
    itemsStore.itemsByCategory["achievement_rewards"];

  const rewardCategories = resolveRewardsCategories(loot, rewardItems);
  const achivementRewardCategory = resolveAchievementRewardCategory(
    loot,
    achievementRewardItems
  );

  const { chestCategories, chestItems } = resolveChestCategories(
    loot,
    chestTables
  );

  const shopsCategory = resolveShopsCategory(loot, shopsTable, chestItems);
  const activityCategory = resolveActivityCategory(loot, activityItems);

  categoryGroups.push({
    title: "Loot and Rewards",
    categories: [
      ...rewardCategories,
      achivementRewardCategory,
      shopsCategory,
      activityCategory,
      misc_loot,
    ],
  });
  categoryGroups.push({ title: "Chests", categories: chestCategories });
  categoryGroups.push({
    title: "Crafted items",
    categories: [...crafted_categories, misc_crafted],
  });
  resolveCategories();

  isLoading.value = false;
});

const categoryGroups = [
  {
    title: "Collectibles",
    categories: [
      {
        title: "All collectibles",
        key: "collectibles",
        source: "collectibles",
        filter: () => true,
      },
    ],
  },
];

const resolveCategories = () => {
  const matchedItemIds = new Set();

  const resolved = categoryGroups.map((group) => {
    const { categories } = group;
    const mappedCategories = categories.map((cat) => {
      const items = itemsStore.itemsByCategory[cat.source] || [];

      let filtered = [];
      if (cat.filter) {
        filtered = items.filter((item) => {
          const isMatch = cat.filter(item);
          if (isMatch) matchedItemIds.add(item.id);
          return isMatch;
        });
      }

      itemsStore.setItems(cat.key, filtered);
      return { ...cat, items: filtered };
    });
    return { ...group, categories: mappedCategories };
  });

  // Handle miscellaneous categories
  for (const group of resolved) {
    for (const cat of group.categories) {
      if (!cat.filter) {
        const items = itemsStore.itemsByCategory[cat.source] || [];
        const filtered = items.filter((item) => !matchedItemIds.has(item.id));
        if (filtered.length) {
          itemsStore.setItems(cat.key, filtered);
          cat.items = filtered;
        }
      }
    }
    group.categories = group.categories.filter(({ items }) => items.length);
  }

  groupedCategories.value = resolved;
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
      <div
        v-for="group in groupedCategories"
        :key="group.title"
        class="detail-groups"
      >
        <details class="details">
          <summary>{{ group.title }}</summary>
          <item-category-panel
            v-for="cat in group.categories"
            :key="cat.title"
            :title="cat.title"
            :display="cat.display"
            :item-category="cat.key"
            :is-open="openCategory === cat.title"
            @toggle="() => toggleCategory(cat.title)"
          />
        </details>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: variables.$base;

  .detail-groups {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: variables.$base;
  }
}

.details {
  width: 100%;
}

.categories {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>