<script setup>
import { ref, computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import { storeToRefs } from "pinia";
import { getItem, searchItems } from "@/utils/axios/routes";
import WsIcon from "@/components/common/WsIcon.vue";

const emit = defineEmits(["select"]);

const props = defineProps({
  gearType: {
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
  ? `${props.gearType}${props.index}`
  : props.gearType;
const gearRef = getDynamicRef(storeKey);
// const itemRef = ref(null);

const itemSearch = async ({ searchKey } = {}) => {
  const types = gearStore.getSlotTypes(storeKey);
  const gearType = ["service", "consumable", "potion"].includes(props.gearType)
    ? null
    : props.gearType;
  // const searchEndpoint = search;
  searchItems({ types, search: searchKey, gearType: gearType }).then(
    ({ data }) => {
      return data;
    }
  );
};

const handleClick = () => emit("select", props.gearType, storeKey);

// itemSearch();
</script>

<template>
  <div class="gear-slot-wrapper" @click="handleClick">
    <p v-if="!gearRef.value" class="typography-label label">{{ gearType }}</p>
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

  cursor: pointer;
  overflow: hidden;
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
