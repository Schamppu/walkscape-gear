<script setup>
import { ref, computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";
import { showItemForActivity } from "@/utils/gear";
import { itemQualityNameSort } from "@/utils/quality";
import WsIcon from "@/components/common/WsIcon.vue";

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

const searchTerm = ref("");
const slotItems = Object.values(itemsStore.allItems).filter(
  ({ gearType, type }) => gearType === props.gearType || type === props.gearType
);

const filteredItems = computed(() => {
  const activity = activityStore.activity;
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
      (item) => filterActivity(item) && filterSearch(item) && filterOwned(item)
    )
    .sort((a, b) => itemQualityNameSort(a, b, true));
});

const handleClick = (item) => {
  emit("selectItem", item);
};
</script>

<template>
  <div class="search-wrapper">
    <input
      v-focus
      ref="searchInput"
      v-model="searchTerm"
      type="text"
      placeholder="Search..."
      class="gear-search"
    />
    <div class="items-wrapper">
      <button
        v-for="item in filteredItems"
        :key="item"
        class="item"
        @click="handleClick(item)"
      >
        <ws-icon
          :iconPath="item.icon"
          :outline-class="`outline-${item.quality}`"
        />
        <span :class="`color-${item.quality}`">
          {{ item.name }}
        </span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gear-search {
  width: 100%;
  padding: $sm;
  border-bottom: 1px solid $boxPrimaryOutline;

  &:focus {
    outline: 1px solid $chipOutline;
  }
}

.items-wrapper {
  flex-grow: 1;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  gap: $xxxs;
  background-color: $bgPrimary;

  .item {
    display: flex;
    gap: $xxs;

    justify-content: center;
    align-items: center;

    background-color: $boxDarkBackground;
    border-radius: $sm;
    border: 1px solid $bgPrimary;

    padding: $xxxs $xxs;
    cursor: pointer;

    &:hover,
    &:focus {
      background-color: $chipBackground;
    }
  }
}
</style>
