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
@use "@/styles/utils/variables.scss";

.bubble-wrapper {
  width: fit-content;

  display: flex;
  gap: variables.$xs;
  border-radius: variables.$sm;
  padding: variables.$xxxxs variables.$xxxs;

  border: 2px solid variables.$boxPrimaryOutline;
  background-color: variables.$boxPrimaryBackground;
}

.text {
  margin: 0;
}
</style> 