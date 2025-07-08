<script setup>
import { ref, computed } from "vue";
import { useItemsStore } from "@/store/items";
import ItemCategoryPanel from "./ItemCategoryPanel.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";

const openCategory = ref(null);
const itemsStore = useItemsStore();

function toggleCategory(category) {
  openCategory.value = openCategory.value === category ? null : category;
  document.getElementById(category).scrollIntoView();
}

const categoryOwnedCount = computed(() => {
  return Object.fromEntries(
    itemsStore.categorizedItems.map(({ title, categories }) => {
      const allItems = categories.flatMap((cat) => cat.items);
      const ownedCount = allItems.filter(
        ({ id }) => id in itemsStore.ownedItems
      ).length;
      return [title, `${ownedCount} / ${allItems.length}`];
    })
  );
});
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
          <summary>
            {{ group.title }}
            <span class="count">{{ categoryOwnedCount[group.title] }} </span>
          </summary>
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

  .count {
    font-weight: normal;
    font-size: $md;
    opacity: 0.7;
    margin-left: $xxs;
    white-space: pre;
  }
}
</style>
