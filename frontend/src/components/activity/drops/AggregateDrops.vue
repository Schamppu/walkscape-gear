<script setup>
import { icons } from "@/constants/iconPaths";
import WsIcon from "@/components/primitives/WsIcon.vue";
import AggregateDropDisplay from "./AggregateDropDisplay.vue";

const props = defineProps({
  context: {
    type: Object,
    default: null,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <section :class="['aggregate-drops', { compact: props.compact }]">
    <aggregate-drop-display type="money" :context="props.context" />
    <aggregate-drop-display type="token" :context="props.context" />
    <p v-if="!compact" class="title">
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

  &.compact {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
