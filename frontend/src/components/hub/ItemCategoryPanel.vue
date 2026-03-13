<script setup>
import { computed, ref, watch } from "vue";
import { useItemsStore } from "@/store/items";
import ItemEntry from "./ItemEntry.vue";
import ConsumableEntry from "./ConsumableEntry.vue";
import PetEntry from "./PetEntry.vue";
import { itemQualityNameSort, levelReqNameSort } from "@/domain/gear/sorting";
import { getItemEntryQualities } from "@/domain/gear/itemEntryQualities";
import { consumableQualityOptions } from "@/domain/constants/quality";
import { injectBaseContext } from "@/composables/context/injectShared";

const props = defineProps({
  group: String,
  title: String,
  itemCategory: String,
  isOpen: Boolean,
});

defineEmits(["toggle"]);
const hasLoaded = ref(false);
const ctx = injectBaseContext();

const getSortFn = (group) => {
  const key = group.toLowerCase();
  switch (key) {
    case "crafted":
      return levelReqNameSort;
    default:
      return itemQualityNameSort;
  }
};

const itemsStore = useItemsStore();
const items = itemsStore.itemsByCategory[props.itemCategory].sort(
  getSortFn(props.group),
);

const selectedItems = ref(
  new Set(
    items
      .filter((item) => itemsStore.ownedItems[item.id]?.owned)
      .map((item) => item.id),
  ),
);

const allSelected = computed(() => {
  return (
    items.length > 0 && items.every((item) => selectedItems.value.has(item.id))
  );
});

const toggleAllConsumables = (e) => {
  if (e.target.checked) {
    const newSet = new Set();
    items.forEach((item) => {
      newSet.add(item.id);
      const data = {
        itemId: item.id,
        owned: true,
        hidden: false,
        quality: consumableQualityOptions[0].value,
        quality2: null,
      };
      itemsStore.toggleItem(data);
    });
    selectedItems.value = newSet;
  } else {
    items.forEach((item) => {
      const data = {
        itemId: item.id,
        owned: false,
        hidden: false,
        quality: null,
        quality2: null,
      };
      itemsStore.toggleItem(data);
    });
    selectedItems.value = new Set();
  }
};

const toggleAll = (e) => {
  if (e.target.checked) {
    const newSet = new Set();
    items.forEach((item) => {
      if (!ctx.embargoedItems.value.has(item.id)) {
        newSet.add(item.id);
        const data = {
          itemId: item.id,
          owned: true,
          hidden: false,
          quality: item.quality,
          quality2: item.quality2,
        };
        itemsStore.toggleItem(data);
      }
    });
    selectedItems.value = newSet;
  } else {
    items.forEach((item) => {
      const data = {
        itemId: item.id,
        owned: false,
        hidden: false,
        quality: item.quality,
        quality2: item.quality2,
      };
      itemsStore.toggleItem(data);
    });
    selectedItems.value = new Set();
  }
};

function toggleSelectAll(e) {
  if (props.group === "Consumables") {
    toggleAllConsumables(e);
  } else {
    toggleAll(e);
  }
}

function toggleItemSelection(data) {
  const { itemId, owned } = data;
  if (owned) {
    selectedItems.value.add(itemId);
  } else {
    selectedItems.value.delete(itemId);
  }
  // Force reactivity
  selectedItems.value = new Set(selectedItems.value);
  itemsStore.toggleItem(data);
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && !hasLoaded.value) {
      hasLoaded.value = true;
    }
  },
);

watch(
  () => items.map((item) => itemsStore.ownedItems[item.id]?.owned),
  (ownedArr) => {
    selectedItems.value = new Set(
      items.filter((item, i) => ownedArr[i]).map((item) => item.id),
    );
  },
  { immediate: true },
);
</script>

<template>
  <div class="category-panel" :id="title">
    <div class="header" @click="$emit('toggle')">
      <input
        type="checkbox"
        :checked="allSelected"
        @click.stop
        @change="toggleSelectAll"
        aria-label="Select all"
      />
      <h3>
        {{ title }}
        <span class="count"
          >({{ selectedItems.size }} / {{ items.length }})</span
        >
      </h3>
      <button class="toggle">{{ isOpen ? "▲" : "▼" }}</button>
    </div>
    <div v-if="isOpen && hasLoaded" class="content">
      <div v-if="group === 'Consumables'">
        <consumable-entry
          v-for="item in items"
          :key="item.id"
          :item="item"
          :selected="selectedItems.has(item.id)"
          @change="toggleItemSelection"
        />
      </div>
      <div v-else-if="group === 'Pets'">
        <pet-entry
          v-for="item in items"
          :key="item.id"
          :pet="item"
          :selected="selectedItems.has(item.id)"
          @change="toggleItemSelection"
        />
      </div>
      <div v-else>
        <item-entry
          v-for="item in items"
          :key="item.id"
          :item="item"
          :qualities="getItemEntryQualities(item)"
          :selected="selectedItems.has(item.id)"
          @change="toggleItemSelection"
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
  color: $txPrimary;

  .count {
    font-weight: normal;
    font-size: $md;
    opacity: 0.7;
    margin-left: $xxs;
    white-space: pre;
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: $xxxs;

  padding: $xxxxs;
}

.toggle {
  cursor: pointer;
  padding: 0 $xs;
  color: $txPrimary !important;
  background: none;
  border: none;
  font: inherit;
}
</style>
