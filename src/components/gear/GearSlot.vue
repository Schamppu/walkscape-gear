<script setup>
import { ref, computed } from "vue";
import { useGearStore } from "@/stores/gear";
import { useActivityStore } from "@/stores/activity";
import { storeToRefs } from "pinia";
import { getItem, searchItems } from "@/utils/axios/items";
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  slotName: {
    type: String,
    required: true,
  },
  index: {
    type: String,
  },
});

const activityStore = useActivityStore();
const { skill } = storeToRefs(activityStore);

const gearStore = useGearStore();
const storeRefs = storeToRefs(gearStore);
const getDynamicRef = (key) => computed(() => storeRefs[key]);

const storeKey = props.index
  ? `${props.slotName}${props.index}`
  : props.slotName;
const gearRef = getDynamicRef(storeKey);
// const itemRef = ref(null);

const loadItem = async (id) => {
  getItem({ id: id }).then(({ data }) => {
    gearStore.setGearSlot(storeKey, data);
  });
};

const itemSearch = async ({ searchKey } = {}) => {
  const types = gearStore.getSlotTypes(storeKey);
  const gearType = ["service", "consumable", "potion"].includes(props.slotName)
    ? null
    : props.slotName;
  // const searchEndpoint = search;
  searchItems({ types, search: searchKey, gearType: gearType }).then(({ data }) => {
    if (data.length) loadItem(data[0].id);
  });
};

itemSearch();
</script>

<template>
  <div class="gear-slot-wrapper">
    <p v-if="!gearRef.value" class="typography-label label">{{ slotName }}</p>
    <div v-else class="content">
      <ws-icon :icon-path="gearRef.value.itemIcon" size="xl" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.gear-slot-wrapper {
  width: 80px;
  height: 80px;
  background-color: variables.$boxDarkBackground;
  border: 1px solid variables.$boxDarkOutline;
  border-radius: variables.$md;
}

.content {
  width: 100%;
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;
}

.label {
  margin-top: variables.$md;
}
</style>
