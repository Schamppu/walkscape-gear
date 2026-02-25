<script setup lang="ts">
import { ref, computed } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
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

const hasBreakdown = computed(() => props.breakdown.length > 0);

function toggle() {
  if (hasBreakdown.value) expanded.value = !expanded.value;
}
</script>

<template>
  <div class="expandable-value">
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
          v-for="line in breakdown"
          :key="line.label"
          class="breakdown-line"
        >
          <ws-icon
            v-if="line.icon"
            :icon-path="line.icon"
            size="xs"
            class="line-icon"
          />
          <span v-else class="line-icon-placeholder" />
          <span class="line-label">{{ snakeToTitle(line.label) }}</span>
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
  width: max-content;
  display: flex;
  flex-direction: column;
  gap: $xxxxs;
  padding: $xxxs $xxs;
  border-radius: $sm;
  border: 1px solid $boxDarkOutline;
  background-color: $boxDarkBackground;
}

.breakdown-line {
  display: grid;
  grid-template-columns: $md $xs 1fr auto;
  align-items: center;
  gap: $xxs;
}

.line-icon {
  grid-column: 1;
}

.line-icon-placeholder {
  grid-column: 1;
  display: inline-block;
  width: $xs;
}

.line-label {
  grid-column: 3;
  color: $txDarker;
  text-align: left;
  white-space: nowrap;
}

.line-value {
  grid-column: 4;
  text-align: right;
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
