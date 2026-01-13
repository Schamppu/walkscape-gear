<script setup>
import InfoBubble from "@/components/common/InfoBubble.vue";

const props = defineProps({
  location: Object,
  gearSetIndex: Number,
  index: Number,
  selected: Boolean,
});

const emit = defineEmits(["change"]);

function handleClick() {
  if (!props.selected) {
    if (props.gearSetIndex !== null) {
      emit("change", {
        location: props.location,
        index: props.index,
        gearSetIndex: props.gearSetIndex,
      });
    }
  }
}
</script>

<template>
  <button class="button-wrapper" @click="handleClick">
    <info-bubble
      :icon-path="location.icon"
      :text="location.name"
      :tooltip="location.name"
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
