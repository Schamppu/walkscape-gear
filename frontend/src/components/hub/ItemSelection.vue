<script setup>
import { ref, computed } from "vue";
import { useItemsStore } from "@/store/items";
import ItemCategoryPanel from "./ItemCategoryPanel.vue";
import LoadingThrobber from "@/components/primitives/LoadingThrobber.vue";
import KeywordFilter from "./KeywordFilter.vue";

const openCategoryGroup = ref(null);
const openCategory = ref(null);
const itemsStore = useItemsStore();
const selectedKeyword = ref(null);

function toggleCategory(group, category) {
  if (openCategoryGroup.value === group && openCategory.value === category) {
    openCategoryGroup.value = null;
    openCategory.value = null;
    return;
  }

  openCategoryGroup.value = group;
  openCategory.value = category;

  // document.getElementById(category).scrollIntoView();
}

const categoryOwnedCount = computed(() => {
  return Object.fromEntries(
    itemsStore.categorizedItems.map(({ title, categories }) => {
      const allIds = categories.flatMap((cat) =>
        cat.items.map((item) => item.id),
      );
      const uniqueIds = Array.from(new Set(allIds));
      const ownedCount = uniqueIds.filter(
        (id) => id in itemsStore.ownedItems && itemsStore.ownedItems[id].owned,
      ).length;
      return [title, `${ownedCount} / ${uniqueIds.length}`];
    }),
  );
});
</script>

<template>
  <details>
    <summary class="typography-h4">Owned Items</summary>
    <div v-if="!itemsStore.isLoaded">
      <loading-throbber />
    </div>
    <template v-else>
      <keyword-filter v-model:keyword="selectedKeyword" />
      <div v-show="!selectedKeyword" class="categories">
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
              :item-category="cat.key"
              :is-open="
                openCategoryGroup === group.title && openCategory === cat.title
              "
              @toggle="() => toggleCategory(group.title, cat.title)"
            />
          </details>
        </div>
      </div>
    </template>
  </details>
</template>

<style lang="scss" scoped>
.detail-groups details[open] {
  margin-bottom: $base;
}

details[open] summary {
  margin-bottom: $md;
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
