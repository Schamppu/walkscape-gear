<script setup>
import WsIcon from "@/components/common/WsIcon.vue";
import WsLabel from "@/components/common/WsLabel.vue";

defineProps({
  iconPath: String,
  label: String,
  text: String,
  tooltip: String,
  borderClass: String,
});
</script>

<template>
  <div class="bubble-wrapper">
    <ws-label v-if="label" :label="label" />
    <div
      :class="['bubble', borderClass]"
      :title="tooltip"
      :aria-label="tooltip"
    >
      <ws-icon v-if="iconPath" :icon-path="iconPath" size="sm" />
      <p class="text">{{ text }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bubble-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $xxs;

  .bubble {
    width: fit-content;
    text-align: left;

    display: flex;
    gap: $xs;
    border-radius: $sm;
    padding: $xxxxs $xxxs;

    border: 2px solid $boxPrimaryOutline;
    background-color: $boxPrimaryBackground;

    &.border-green {
      border: 1px solid $txPositive;
    }

    &.selected-border {
      border-color: $chipOutline;
      box-shadow: 0 0 0 1px $chipOutline;
    }
  }
}

.text {
  margin: 0;
}
</style>
