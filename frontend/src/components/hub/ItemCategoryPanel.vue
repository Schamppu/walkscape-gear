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

const itemStore = useItemsStore();
const items = computed(() => itemStore.itemsByCategory[props.itemCategory]);
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

  border-radius: variables.$sm variables.$sm 0 0;
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
