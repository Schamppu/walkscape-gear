<script setup>
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  iconPath: String,
  text: String,
});
</script>

<template>
  <div class="bubble-wrapper">
    <ws-icon :icon-path="iconPath" size="sm" />
    <p class="text">{{ text }}</p>
  </div>
</template>

<style lang="scss" scoped>

.bubble-wrapper {
  width: fit-content;

  display: flex;
  gap: $xs;
  border-radius: $sm;
  padding: $xxxxs $xxxs;

  border: 2px solid $boxPrimaryOutline;
  background-color: $boxPrimaryBackground;
}

.text {
  margin: 0;
}
</style> 