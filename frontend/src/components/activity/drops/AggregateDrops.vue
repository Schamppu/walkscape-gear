<script setup>
import { icons } from "@/constants/iconPaths";
import WsIcon from "@/components/common/WsIcon.vue";
import AggregateDropDisplay from "./AggregateDropDisplay.vue";
</script>

<template>
  <section class="aggregate-drops">
    <aggregate-drop-display type="money" />
    <aggregate-drop-display type="token" />
    <p class="title">
      /1k
      <ws-icon :icon-path="icons.steps" size="sm" />
    </p>
  </section>
</template>

<style lang="scss" scoped>
.title {
  display: flex;
  gap: $xxxxs;
  align-items: flex-end;
}

.aggregate-drops {
  display: flex;
  gap: $sm;
  align-items: center;
  margin-bottom: $xxxs;
}
</style>
