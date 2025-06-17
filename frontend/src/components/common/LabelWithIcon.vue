<script setup>
import WsIcon from "./WsIcon.vue";

defineProps({
  icon: { type: String, default: null },
  text: { type: String, required: true },
});
</script>

<template>
  <div class="label-with-icon">
    <ws-icon v-if="icon" :iconPath="icon" />
    <span class="label-text">{{ text }}</span>
  </div>
</template>

<style scoped lang="scss">
.label-with-icon {
  display: flex;
  align-items: center;
  gap: $sm;

  .label-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
