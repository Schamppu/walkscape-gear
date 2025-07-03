<script setup>
import { ref, computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { showItemForActivity } from "@/utils/gear";
import { itemQualityNameSort } from "@/utils/quality";
import WsIcon from "@/components/common/WsIcon.vue";
import SearchItemDisplay from "./SearchItemDisplay.vue";

const props = defineProps({
  gearType: {
    type: String,
    required: true,
  },
  slotName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["selectItem"]);

const gearStore = useGearStore();
const itemsStore = useItemsStore();
const activityStore = useActivityStore();
const playerStore = usePlayerStore();

const searchTerm = ref("");
const selectedStat = ref("none");
const filterStat = computed(() => {
  if (selectedStat.value === "none") return null;
  return playerStore.stats.find(({ type }) => type === selectedStat.value);
});

const slotItems = Object.values(itemsStore.allItems).filter(
  ({ gearType, type }) => gearType === props.gearType || type === props.gearType
);

const otherSlotIds = computed(() => {
  if (props.gearType !== "tool") return [];
  return [1, 2, 3, 4, 5, 6]
    .map((i) => `tool${i}`)
    .filter((id) => id !== props.slotName)
    .map((slot) => gearStore.get(slot)?.id || null);
});

const filteredItems = computed(() => {
  const activity =
    (activityStore.activitySelected && activityStore.activity) ||
    (activityStore.recipeSelected && activityStore.recipe);
  const term = searchTerm.value.trim().toLowerCase();
  const showOwned = gearStore.showOwned;
  const showUseful = gearStore.showUseful;

  const filterActivity = (item) => {
    if (!activity || !showUseful) {
      return true;
    }

    return (
      showUseful &&
      activity &&
      showItemForActivity(item, activity, item.quality)
    );
  };
  const filterSearch = ({ name }) =>
    (term && name.toLowerCase().includes(term)) || !term;
  const filterOwned = (item) =>
    (showOwned && item.id in itemsStore.ownedItems) || !showOwned;
  const filterEquipped = (item) =>
    !(otherSlotIds.value.length && otherSlotIds.value.includes(item.id));

  return slotItems
    .map((item) => {
      const { id } = item;
      const owned = id in itemsStore.ownedItems;
      const quality = owned ? itemsStore.ownedItems[id].quality : item.quality;
      const quality2 = owned ? itemsStore.ownedItems[id].quality2 : null;

      const out = [
        {
          ...item,
          quality,
        },
      ];
      if (quality2 && quality2 !== quality) {
        out.push({
          ...item,
          quality: quality2,
        });
      }

      return out;
    })
    .flat()
    .filter(
      (item) =>
        filterActivity(item) &&
        filterSearch(item) &&
        filterOwned(item) &&
        filterEquipped(item)
    )
    .sort((a, b) => itemQualityNameSort(a, b, true));
});

const handleClick = (item) => {
  emit("selectItem", item);
};
</script>

<template>
  <div class="search-wrapper">
    <div class="stat-filter-select">
      <label for="stat-filter">Filter stat:</label>
      <ws-icon
        v-if="selectedStat !== 'none'"
        :icon-path="filterStat.icon"
        size="sm"
      />
      <select id="stat-filter" v-model="selectedStat">
        <option value="none">None</option>
        <option
          v-for="stat in playerStore.stats"
          :key="stat"
          :value="stat.type"
        >
          {{ stat.name }}
        </option>
      </select>
    </div>

    <input
      v-focus
      ref="searchInput"
      v-model="searchTerm"
      type="text"
      placeholder="Search..."
      class="gear-search"
    />
    <div class="items-wrapper">
      <search-item-display
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        @click="handleClick(item)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gear-search {
  width: 100%;
  padding: $sm;
  border-bottom: 1px solid $boxPrimaryOutline;
  box-sizing: border-box;

  &:focus {
    outline: 1px solid $chipOutline;
  }
}

.stat-filter-select {
  display: flex;
  width: 100%;
  align-items: center;
  gap: $xxs;
  padding: $xxs;
  box-sizing: border-box;

  select {
    padding: $xxxs $xxs;
    border-radius: $sm;
    border: 1px solid $boxPrimaryOutline;
    background-color: $bgPrimary;

    &:focus {
      outline: 1px solid $chipOutline;
    }
  }
}

.items-wrapper {
  flex-grow: 1;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  gap: $xxxs;
  background-color: $bgPrimary;
}
</style>
