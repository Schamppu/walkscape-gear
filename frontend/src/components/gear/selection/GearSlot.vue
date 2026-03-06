<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { getPetIcon } from "@/domain/pets/getPetIcon";
import WsIcon from "@/components/primitives/WsIcon.vue";

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

const gearStore = useGearStore();

const storeKey = props.index
  ? `${props.gearType}${props.index}`
  : props.gearType;
const gearRef = computed(() => gearStore.selectedGearset[storeKey]);
const icon = computed(() => {
  return "egg" in gearRef.value
    ? getPetIcon(
        gearRef.value,
        gearRef.value.quality,
        gearRef.value.quality2 === "rare",
      )
    : gearRef.value.icon;
});

const getTypeName = (gearType) => {
  switch (gearType) {
    case "activityInput":
      return "Input";
    default:
      return gearType;
  }
};

const handleClick = () => emit("select", props.gearType, storeKey);
</script>

<template>
  <button class="gear-slot-wrapper" @click="handleClick">
    <p
      v-if="!gearRef"
      class="typography-label label"
      :style="[
        gearType.length >= 7 ? 'font-size: 0.6rem;' : '',
        gearType.length >= 9 ? 'font-size: 0.5rem;' : '',
      ]"
    >
      {{ getTypeName(props.gearType) }}
    </p>
    <div v-else class="content">
      <ws-icon
        :icon-path="icon"
        size="lg"
        :outline-class="`outline-${gearRef.quality}`"
      />
    </div>
  </button>
</template>

<style lang="scss" scoped>
.gear-slot-wrapper {
  display: flex;
  flex-direction: column;
  align-content: center;

  width: 72px;
  height: 72px;
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;

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
  width: 100%;
  margin-top: $md;
  text-align: center;
}
</style>
