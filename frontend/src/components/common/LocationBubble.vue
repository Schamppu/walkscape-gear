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
  activityStore.setLocation(props.location);
}
</script>

<template>
  <info-bubble
    :icon-path="location.icon"
    :text="location.name"
    :tooltip="location.name"
    :class="{ 'selected-border': isSelected }"
    @click="handleClick"
    style="cursor: pointer"
  />
</template>

<style lang="scss" scoped>
.selected-border {
  border-color: $chipOutline;
  box-shadow: 0 0 0 1px $chipOutline;
}
</style>
