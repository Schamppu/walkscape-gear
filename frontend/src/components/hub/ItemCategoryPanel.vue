<script setup>
import { computed, ref, watch } from "vue";
import { useItemsStore } from "@/store/items";
import ItemEntry from "./ItemEntry.vue";
import ConsumableEntry from "./ConsumableEntry.vue";
import { itemQualityNameSort, consumableQualityOptions } from "@/utils/quality";

const props = defineProps({
  group: String,
  title: String,
  qualities: Number,
  itemCategory: String,
  isOpen: Boolean,
});

const emit = defineEmits(["toggle"]);
const hasLoaded = ref(false);

const itemsStore = useItemsStore();
const items =
  itemsStore.itemsByCategory[props.itemCategory].sort(itemQualityNameSort);

const selectedItems = ref(
  new Set(
    items
      .filter((item) => itemsStore.ownedItems[item.id]?.owned)
      .map((item) => item.id)
  )
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
      newSet.add(item.id);
      const data = {
        itemId: item.id,
        owned: true,
        hidden: false,
        quality: item.quality,
        quality2: item.quality2,
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
  }
);

watch(
  () => items.map((item) => itemsStore.ownedItems[item.id]?.owned),
  (ownedArr) => {
    selectedItems.value = new Set(
      items.filter((item, i) => ownedArr[i]).map((item) => item.id)
    );
  },
  { immediate: true }
);
</script>

<template>
  <div class="category-panel" :id="title">
    <div class="header" @click="emit('toggle')">
      <input
        type="checkbox"
        :checked="allSelected"
        @click.stop
        @change="toggleSelectAll"
        aria-label="Select all"
      />
      <h3>{{ title }}</h3>
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
      <div v-else>
        <item-entry
          v-for="item in items"
          :key="item.id"
          :item="item"
          :qualities="qualities || 0"
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
  color: white;
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
