<script setup lang="ts">
import { ref, computed } from "vue";
import WsIcon from "@/components/primitives/WsIcon.vue";
import type { BreakdownLine } from "@/domain/drops/aggregateDropValue";
import { n } from "@/utils/number";
import { snakeToTitle } from "@/utils/string";

const props = defineProps<{
  text: string;
  iconPath?: string;
  tooltip?: string;
  breakdown: BreakdownLine[];
}>();

const expanded = ref(false);

const visibleBreakdown = computed(() =>
  props.breakdown.filter((line) => Math.abs(line.value) >= 0.005),
);

const hasBreakdown = computed(() => visibleBreakdown.value.length > 0);

function toggle() {
  if (hasBreakdown.value) expanded.value = !expanded.value;
}

function close() {
  expanded.value = false;
}
</script>

<template>
  <div class="expandable-value" v-click-outside="close">
    <div
      :class="['bubble', { clickable: hasBreakdown }]"
      :title="tooltip"
      :aria-label="tooltip"
      @click="toggle"
    >
      <ws-icon v-if="iconPath" :icon-path="iconPath" size="sm" />
      <p class="text">{{ text }}</p>
      <span v-if="hasBreakdown" class="chevron" :class="{ open: expanded }">
        ▾
      </span>
    </div>

    <Transition name="breakdown">
      <div v-if="expanded && hasBreakdown" class="breakdown">
        <div
          v-for="line in visibleBreakdown"
          :key="line.label"
          class="breakdown-line"
          :title="snakeToTitle(line.label)"
        >
          <ws-icon v-if="line.icon" :icon-path="line.icon" size="xs" />
          <span v-else class="line-icon-placeholder" />
          <span
            :class="['line-value', line.value < 0 ? 'negative' : 'positive']"
          >
            {{ line.value < 0 ? "-" : "+" }}{{ n(Math.abs(line.value), 2) }}
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.expandable-value {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $xxxxs;
  position: relative;
}

.bubble {
  width: fit-content;
  display: flex;
  align-items: center;
  gap: $xs;
  border-radius: $sm;
  padding: $xxxxs $xxxs;
  border: 2px solid $boxPrimaryOutline;
  background-color: $boxPrimaryBackground;

  &.clickable {
    cursor: pointer;

    &:hover {
      border-color: $chipOutline;
    }
  }
}

.text {
  margin: 0;
}

.chevron {
  font-size: $sm;
  color: $txDarker;
  line-height: 1;
  transition: transform 0.15s ease;
  display: inline-block;

  &.open {
    transform: rotate(180deg);
  }
}

.breakdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: $xxxxs;
  z-index: 100;
  min-width: 100%;
  width: max-content;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: $xxxxs;
  padding: $xxxs $xxs;
  border-radius: $sm;
  border: 2px solid $chipOutline;
  background-color: $boxPrimaryBackground;
}

.breakdown-line {
  display: flex;
  align-items: center;
  gap: $xxs;
}

.line-icon-placeholder {
  display: inline-block;
  width: $xs;
  height: $xs;
  flex-shrink: 0;
}

.line-value {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  &.positive {
    color: $txPositive;
  }

  &.negative {
    color: $txNegative;
  }
}

// Transition
.breakdown-enter-active,
.breakdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.breakdown-enter-from,
.breakdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
