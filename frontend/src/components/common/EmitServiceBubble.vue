<script setup>
import InfoBubble from "@/components/common/InfoBubble.vue";

const props = defineProps({
  service: Object,
  gearSetIndex: Number,
  index: Number,
  selected: Boolean,
});

const emit = defineEmits(["change"]);

async function handleClick() {
  if (!props.selected)
    if (props.gearSetIndex !== null) {
      emit("change", {
        service: props.service,
        index: props.index,
        gearSetIndex: props.gearSetIndex,
      });
    }
}
</script>

<template>
  <button class="button-wrapper" @click="handleClick">
    <info-bubble
      :icon-path="service.icon"
      :text="service.name"
      :tooltip="service.name"
      :border-class="props.selected ? 'selected-border' : ''"
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
