<script setup>
import { ref, onMounted } from "vue";
import { useItemsStore } from "@/store/items";
import { getCategorizedItems } from "@/utils/axios/api_routes";
import { fetchOwnedItems } from "@/utils/axios/db_routes";
import ItemCategoryPanel from "./ItemCategoryPanel.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";

const isLoading = ref(true);
const openCategory = ref(null);
const groupedCategories = ref([]);
const itemsStore = useItemsStore();

onMounted(async () => {
  const [{ data: categorizedItems }, ownedItems] = await Promise.all([
    getCategorizedItems(),
    fetchOwnedItems(),
  ]);

  itemsStore.setOwnedItems(ownedItems);
  groupedCategories.value = categorizedItems;

  categorizedItems.forEach(({ categories }) => {
    categories.forEach(({ key, items }) => {
      itemsStore.setItems(key, items);
    });
  });

  isLoading.value = false;
});

function toggleCategory(category) {
  openCategory.value = openCategory.value === category ? null : category;
  document.getElementById(category).scrollIntoView();
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
            :group="group.title"
            :title="cat.title"
            :qualities="cat.qualities"
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
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: $base;

  .detail-groups {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: $base;
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
