<script setup>
import WsIcon from "@/components/primitives/WsIcon.vue";

defineProps({
  keyword: Object,
});
</script>

<template>
  <div class="keyword-display">
    <ws-icon v-if="keyword.icon" :iconPath="keyword.icon" size="sm" />
    <p class="text">
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

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  padding: $xxxxs $md $xxxxs $xxxxs;

  .text {
    text-wrap: nowrap;
  }
}
</style>
