<script setup lang="ts">
import { computed } from "vue";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";
import ItemEntry from "./ItemEntry.vue";
import ConsumableEntry from "./ConsumableEntry.vue";
import PetEntry from "./PetEntry.vue";
import WsIcon from "../primitives/WsIcon.vue";
import { getItemEntryQualities } from "@/domain/gear/itemEntryQualities";
import type { ItemDetail, Keyword, PetDetail } from "@/domain/types";
import type { ToggleItemPayload } from "@/store/items";

const props = defineProps({
  keyword: {
    type: String,
    default: null,
  },
});

const emit = defineEmits<{
  (e: "update:keyword", value: string | null): void;
}>();

const itemsStore = useItemsStore();
const dataStore = useDataStore();

type KeywordItem = ItemDetail & Partial<PetDetail>;

function isPetItem(item: KeywordItem): item is ItemDetail & PetDetail {
  return "egg" in item && Array.isArray(item.levels);
}

function isConsumableItem(item: KeywordItem): boolean {
  return item.type === "consumable" || !!item.consumableType;
}

const allKeywords = computed(() => {
  const kws = new Set<string>();
  for (const item of Object.values(itemsStore.allGearItems) as KeywordItem[]) {
    if (!item.keywords) continue;
    for (const kw of item.keywords) {
      kws.add(kw);
    }
  }
  return [...kws]
    .sort()
    .map((kw) => dataStore.getKeywordById(kw))
    .filter((kw): kw is Keyword => kw !== null);
});

const filteredItems = computed(() => {
  if (!props.keyword) return [];
  return (Object.values(itemsStore.allGearItems) as KeywordItem[]).filter(
    (item) =>
    item.keywords && item.keywords.includes(props.keyword),
  );
});

function onSelect(e: Event) {
  const target = e.target as HTMLSelectElement | null;
  emit("update:keyword", target?.value || null);
}

function clear() {
  emit("update:keyword", null);
}

function toggleItem(data: ToggleItemPayload) {
  itemsStore.toggleItem(data);
}
</script>

<template>
  <div class="keyword-filter">
    <div class="filter-row">
      <label class="filter-label" for="keyword-select">
        Show items with keyword:
      </label>
      <div class="select-wrapper">
        <select
          id="keyword-select"
          :value="keyword ?? ''"
          @change="onSelect"
          class="keyword-select"
        >
          <option value="">— select keyword —</option>
          <option v-for="kw in allKeywords" :key="kw.id" :value="kw.id">
            <ws-icon
              v-if="kw.icon"
              :icon-path="kw.icon"
              size="sm"
              alt-text=""
              decorative
              class="keyword-icon"
            />
            {{ kw.name }}
          </option>
        </select>
        <button
          v-if="keyword"
          class="clear-btn"
          @click="clear"
          aria-label="Clear keyword filter"
        >
          ✕
        </button>
      </div>
    </div>

    <div v-if="keyword && filteredItems.length" class="keyword-results">
      <template v-for="item in filteredItems">
        <pet-entry
          v-if="isPetItem(item)"
          :key="`pet-${item.id}`"
          :pet="item"
          :selected="!!itemsStore.ownedItems[item.id]?.owned"
          @change="toggleItem"
        />
        <consumable-entry
          v-else-if="isConsumableItem(item)"
          :key="`consumable-${item.id}`"
          :item="item"
          :selected="!!itemsStore.ownedItems[item.id]?.owned"
          @change="toggleItem"
        />
        <item-entry
          v-else
          :key="`gear-${item.id}`"
          :item="item"
          :qualities="getItemEntryQualities(item)"
          :selected="!!itemsStore.ownedItems[item.id]?.owned"
          @change="toggleItem"
        />
      </template>
    </div>
    <div v-else-if="keyword && filteredItems.length === 0" class="no-results">
      No items found for "{{ keyword }}".
    </div>
  </div>
</template>

<style lang="scss" scoped>
.keyword-filter {
  display: flex;
  flex-direction: column;
  gap: $sm;
  margin-bottom: $xxs;
  width: 100%;
}

.filter-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $sm;
  flex-wrap: wrap;
}

.filter-label {
  font-size: $md;
  white-space: nowrap;
}

.select-wrapper {
  display: flex;
  align-items: center;
  gap: $xxs;
}

.keyword-select {
  background: $boxDarkBackground;
  color: $txPrimary;
  border: 1px solid $bgPrimary;
  border-radius: $sm;
  padding: $xxxs $xxs;
  font: inherit;
  font-size: $md;
  cursor: pointer;
}

.clear-btn {
  background: none;
  border: 1px solid $bgPrimary;
  border-radius: $sm;
  color: $txPrimary;
  cursor: pointer;
  font: inherit;
  font-size: $md;
  padding: $xxxs $xxs;
  line-height: 1;

  &:hover {
    background: $boxDarkBackground;
  }
}

.keyword-results {
  display: flex;
  flex-direction: column;
  gap: $xxxs;
}

.no-results {
  font-size: $md;
  opacity: 0.7;
}
</style>
