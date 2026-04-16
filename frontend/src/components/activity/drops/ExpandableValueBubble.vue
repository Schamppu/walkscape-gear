<script setup lang="ts">
import { ref, computed, useSlots } from "vue";
import WsIcon from "@/components/primitives/WsIcon.vue";
import type { BreakdownLine } from "@/domain/drops/aggregateDropValue";
import { n } from "@/utils/number";
import { snakeToTitle } from "@/utils/string";
import { icons } from "@/constants/iconPaths";

const props = withDefaults(
  defineProps<{
    text: string;
    iconPath?: string;
    tooltip?: string;
    label?: string;
    breakdown?: BreakdownLine[];
    breakdownType?: "value" | "steps";
  }>(),
  { breakdown: () => [], breakdownType: "value" },
);

const slots = useSlots();
const expanded = ref(false);

const visibleBreakdown = computed(() => {
  if (props.breakdownType === "steps") return props.breakdown;
  return props.breakdown.filter((line) => Math.abs(line.value) >= 0.005);
});

const hasBreakdown = computed(() => visibleBreakdown.value.length > 0 || !!slots.breakdown);

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
      <span v-if="label" class="label">{{ label }}</span>
      <span v-if="hasBreakdown" class="chevron" :class="{ open: expanded }">
        ▾
      </span>
    </div>

    <Transition name="breakdown">
      <div v-if="expanded && hasBreakdown" class="breakdown">
        <slot name="breakdown">
          <div
            v-for="line in visibleBreakdown"
            :key="line.label"
            class="breakdown-line"
            :title="snakeToTitle(line.label)"
          >
            <ws-icon v-if="line.icon" :icon-path="line.icon" size="xs" />
            <span v-else class="line-icon-placeholder" />
            <span v-if="breakdownType === 'steps'" class="line-steps">
              {{ n(line.value, 0) }}
              <ws-icon :icon-path="icons.steps" size="xs" />
            </span>
            <span
              v-else
              :class="['line-value', line.value < 0 ? 'negative' : 'positive']"
            >
              {{ line.value < 0 ? "-" : "+" }}{{ n(Math.abs(line.value), 2) }}
            </span>
          </div>
        </slot>
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

.label {
  font-size: 0.75rem;
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

.line-steps {
  display: flex;
  align-items: center;
  gap: $xxxxs;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
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
