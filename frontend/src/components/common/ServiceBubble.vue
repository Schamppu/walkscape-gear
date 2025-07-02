<script setup>
import { computed } from "vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";

const props = defineProps({
  service: Object,
});

const activityStore = useActivityStore();
const { service: selectedService } = storeToRefs(activityStore);

const isSelected = computed(() => {
  return (
    selectedService.value &&
    props.service &&
    selectedService.value.id === props.service.id
  );
});

async function handleClick() {
  if (!isSelected.value) await activityStore.setService(props.service);
}
</script>

<template>
  <button class="button-wrapper" @click="handleClick">
    <info-bubble
      :icon-path="service.icon"
      :text="service.name"
      :tooltip="service.name"
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

:deep(.selected-border) {
  border-color: $chipOutline;
  box-shadow: 0 0 0 1px $chipOutline;
}
</style>
