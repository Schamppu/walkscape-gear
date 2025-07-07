<script setup>
import { computed } from "vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";

const props = defineProps({
  location: Object,
});

const activityStore = useActivityStore();
const { location: selectedLocation } = storeToRefs(activityStore);

const isSelected = computed(() => {
  return (
    selectedLocation.value &&
    props.location &&
    selectedLocation.value.id === props.location.id
  );
});

function handleClick() {
  if (!isSelected.value) activityStore.setLocation(props.location);
}
</script>

<template>
  <button class="button-wrapper" @click="handleClick">
    <info-bubble
      :icon-path="location.icon"
      :text="location.name"
      :tooltip="location.name"
      :border-class="isSelected ? 'selected-border' : ''"
      style="cursor: pointer"
    />
  </button>
</template>

<style lang="scss" scoped>
.button-wrapper {
  padding: 0;
  margin: 0;
  background-color: none;
  border-radius: $sm;
}
</style>
