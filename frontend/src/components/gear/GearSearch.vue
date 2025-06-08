<script setup>
import { ref, computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";
import { showItemForActivity } from "@/utils/gear";
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
  ({ gearType }) => gearType === props.gearType
);

const filteredItems = computed(() => {
  const activity = activityStore.activity;
  const term = searchTerm.value.trim().toLowerCase();
  const useOwned = gearStore.useOwned;

  const filterActivity = (item) => {
    const { id } = item;
    const owned = id in itemsStore.ownedItems;
    const quality = owned ? itemsStore.ownedItems[id].quality : item.quality;
    return (
      (activity && showItemForActivity(item, activity, quality)) || !activity
    );
  };
  const filterSearch = ({ name }) =>
    (term && name.toLowerCase().includes(term)) || !term;
  const filterOwned = (item) =>
    (useOwned && item.id in itemsStore.ownedItems) || !useOwned;

  return slotItems.filter(
    (item) => filterActivity(item) && filterSearch(item) && filterOwned(item)
  );
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
      <div
        v-for="item in filteredItems"
        :key="item"
        class="item"
        @click="handleClick(item)"
      >
        <ws-icon :icon-path="item.icon" />
        <span class="text">
          {{ item.name }}
        </span>
      </div>
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

  .item {
    display: flex;
    gap: 16px;

    justify-content: center;

    padding: $xs;
    border: 2px solid $chipOutline;
    cursor: pointer;

    &:hover {
      background-color: $chipBackground;
    }
  }
}
</style>