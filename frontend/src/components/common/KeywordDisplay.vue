<script setup>
import WsIcon from "./WsIcon.vue";

const props = defineProps({
  keyword: Object,
});
</script>

<template>
  <div class="keyword-display">
    <ws-icon v-if="keyword.icon" :iconPath="keyword.icon" />
    <p class="text">
      <span v-if="keyword.quantity">{{ keyword.quantity }}</span>
      {{ keyword.name }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.keyword-display {
  display: flex;
  align-items: center;
  gap: $xxs;
  border-radius: $sm;

  background-color: $boxTransparentDarkBackground;
  padding: $xxxxs $md $xxxxs $xxxxs;

  .text {
    text-wrap: nowrap;
  }
}
</style>