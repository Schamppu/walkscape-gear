<script setup lang="ts">
import { computed, ref } from "vue";
import { injectEffectiveAttrs } from "@/composables/context/injectShared";
import WsIcon from "@/components/primitives/WsIcon.vue";
import WsText from "@/components/common/text/WsText.vue";
import StatSourceDisplay from "@/components/stats/StatSourceDisplay.vue";
import {
  sumStatValues,
  computeApplicableTotal,
} from "@/domain/stats/statAggregation";
import type { StatDefinition } from "@/domain/types/stat";

const props = defineProps<{
  stat: StatDefinition;
  data?: Record<string, unknown>;
  isPercent?: boolean;
}>();

const isOpen = ref(false);

const { allAttrs, totalsByStat } = injectEffectiveAttrs();

const filterStat = (attr: { stats: Array<{ stat: string; isPercent: boolean }> }) => {
  const { stat: statId, isPercent: percent } = attr.stats[0];
  return statId == props.stat.id && percent === props.isPercent;
};

const sumTotal = computed(() => {
  const statAttrs = allAttrs.value.filter(filterStat);
  const total = sumStatValues(statAttrs.map((attr) => attr.stats[0]));
  const roundedValue =
    Math.round(props.isPercent ? 10000 * total : 100 * total) / 100;
  const value = roundedValue <= 0 ? roundedValue : `+${roundedValue}`;
  return props.isPercent ? `${value}%` : value;
});

const sumApplicable = computed(() => {
  const { sum, positive, negative } = computeApplicableTotal(
    totalsByStat.value,
    props.stat.type,
    props.isPercent,
  );
  const isNegative = Math.abs(negative) > Math.abs(positive);
  const roundedVal =
    Math.round(props.isPercent ? 10000 * sum : 100 * sum) / 100;
  const signedVal = roundedVal <= 0 ? roundedVal : `+${roundedVal}`;
  const value = props.isPercent ? `${signedVal}%` : signedVal;
  return { value, isNegative };
});

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <section class="stat-display">
    <button class="stat" @click="toggle">
      <div
        class="active"
        :class="sumApplicable.isNegative ? 'negative' : 'positive'"
      >
        <span>{{ sumApplicable.value }}</span>
        <ws-icon :iconPath="stat.icon" size="sm" />
        <ws-text :text="stat.name" :data="data" />
      </div>
      <div class="group">
        <div class="total-bubble">{{ sumTotal }}</div>
        <span class="chevron" :class="{ isOpen }">▼</span>
      </div>
    </button>
    <stat-source-display v-if="isOpen" :stat="stat" :is-percent="isPercent" />
  </section>
</template>

<style lang="scss" scoped>
.stat-display {
  width: 100%;
  display: flex;
  flex-direction: column;

  border: 2px solid $boxDarkBackground;
  border-radius: $sm;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  background-color: $boxDarkBackground;
  border-radius: $sm;
  padding: $xxs;

  .active {
    min-width: 0;
    text-align: left;

    & > * {
      margin-inline-end: $xxxs;

      &:last-child {
        margin-inline-end: 0;
      }
    }

    & > div {
      display: inline-block;
      vertical-align: middle;
    }

    & > span {
      display: inline;
      vertical-align: middle;
    }
  }
}

.group {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $sm;

  .total-bubble {
    background-color: $bgPrimary;
    border: 1px solid $boxDarkOutline;
    padding: $xxxxs $xxs;
    border-radius: $md;
  }

  .chevron {
    transition: transform 0.2s ease;
    display: inline-block;
    transform: rotate(0deg);

    &.isOpen {
      transform: rotate(180deg);
    }
  }
}
</style>
