<script setup>
import { computed } from "vue";
import WsIcon from "./WsIcon.vue";
import { useEffectiveAttrs } from "@/utils/useEffectiveAttrs";

const props = defineProps({
  keyword: Object,
});

const { equippedKeywords } = useEffectiveAttrs();
const borderClass = computed(() => {
  const { id, quantity } = props.keyword;
  const quantLim = quantity ? quantity : 1;
  return id in equippedKeywords.value
    ? equippedKeywords.value[id] >= quantLim
      ? "border-green"
      : "border-red"
    : "border-red";
});

const tooltip = computed(() => {
  const { name, quantity } = props.keyword;
  return quantity ? `Requires ${quantity} ${name}` : `Requires ${name}`;
});
</script>

<template>
  <div
    class="keyword-display"
    :title="tooltip"
    :aria-label="tooltip"
    :class="[borderClass]"
  >
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

.border-green {
  border: 1px solid $txPositive;
}

.border-red {
  border: 1px solid $txNegative;
}
</style>
