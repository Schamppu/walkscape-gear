<script setup>
import { ref } from "vue";
import { useItemsStore } from "@/store/items";
import ItemCategoryPanel from "./ItemCategoryPanel.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";

const openCategory = ref(null);
const itemsStore = useItemsStore();

function toggleCategory(category) {
  openCategory.value = openCategory.value === category ? null : category;
  document.getElementById(category).scrollIntoView();
}
</script>

<template>
  <div class="wrapper">
    <h2 class="typography-h3">Owned Items</h2>
    <div v-if="!itemsStore.isLoaded">
      <loading-throbber />
    </div>
    <div v-else class="categories">
      <div
        v-for="(group, index) in itemsStore.categorizedItems"
        :key="`group-${index}`"
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
