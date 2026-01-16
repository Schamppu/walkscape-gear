<script setup>
import { computed, ref } from "vue";
import useBaseContext from "@/composables/useBaseContext";
import { useEffectiveAttrs } from "@/composables/useEffectiveAttrs";
import WsIcon from "@/components/common/WsIcon.vue";
import StatSourceDisplay from "@/components/stats/StatSourceDisplay.vue";

const props = defineProps({
  stat: {
    type: Object,
    required: true,
  },
  isPercent: Boolean,
});

const isOpen = ref(false);

const ctx = useBaseContext();
const { allAttrs, totalsByStat } = useEffectiveAttrs(ctx);

const sumStats = (stats) => {
  return stats.reduce((a, { value: b }) => a + b, 0);
};

const filterStat = (attr) => {
  const { stat: statId, isPercent: percent } = attr.stats[0];
  return statId == props.stat.id && percent === props.isPercent;
};

const sumTotal = computed(() => {
  const statAttrs = allAttrs.value.filter(filterStat);
  const total = sumStats(statAttrs.map((attr) => attr.stats[0]));
  const roundedValue =
    Math.round(props.isPercent ? 10000 * total : 100 * total) / 100;
  const value = roundedValue <= 0 ? roundedValue : `+${roundedValue}`;
  return props.isPercent ? `${value}%` : value;
});

const sumApplicable = computed(() => {
  const key = props.isPercent ? "percent" : "flat";
  const type = props.stat.type;

  const empty = { sum: 0, positive: 0, negative: 0 };
  const totalObj = !(type in totalsByStat.value)
    ? empty
    : !(key in totalsByStat.value[type])
    ? empty
    : totalsByStat.value[type][key];

  const { sum, positive, negative } = totalObj;

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
        <span>{{ stat.name }}</span>
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

  background-color: $boxDarkBackground;
  border-radius: $sm;
  padding: $xxs;

  .active {
    display: flex;
    gap: $xxxs;
    align-items: center;
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
