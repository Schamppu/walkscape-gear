<script setup>
import WsIcon from "@/components/primitives/WsIcon.vue";
import { icons } from "@/constants/iconPaths";
import { n } from "@/utils/number";

defineProps({
  data: Number,
  comp: Number,
  invert: { type: Boolean, default: false },
});
</script>

<template>
  <div v-if="data" class="steps-line">
    <span
      :class="{
        positive: invert ? comp > 0 : comp < 0,
        negative: invert ? comp < 0 : comp > 0,
      }"
      >{{ n(data, 0) }}</span
    >
    <ws-icon :iconPath="icons.steps" size="xs" />
  </div>
</template>

<style lang="scss" scoped>
.steps-line {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $xxxs;

  border-radius: $sm;
  padding: $xxxxs;
  width: 100%;
  box-sizing: border-box;

  span {
    text-wrap: nowrap;
    text-align: left;
  }
}
</style>
