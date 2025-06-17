<script setup>
import { computed } from "vue";
import { checkRequirements } from "@/utils/requirements";
import { useEffectiveAttrs } from "@/utils/useEffectiveAttrs";
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  stat: {
    type: Object,
    required: true,
  },
  isPercent: Boolean,
});

const { allAttrs, totalsByStat } = useEffectiveAttrs();

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
  const value = Math.round(props.isPercent ? 100 * total : total);
  return props.isPercent ? `${value}%` : value;
});

const sumApplicable = computed(() => {
  const key = props.isPercent ? "percent" : "flat";
  const type = props.stat.type;

  const total = !(type in totalsByStat.value)
    ? 0
    : !(key in totalsByStat.value[type])
    ? 0
    : totalsByStat.value[type][key];

  const value = Math.round(props.isPercent ? 100 * total : total);
  return props.isPercent ? `${value}%` : value;
});
</script>

<template>
  <section class="stat">
    <div class="active">
      <span>{{ sumApplicable }}</span>
      <ws-icon :iconPath="stat.icon" size="sm" />
      <span>{{ stat.name }}</span>
    </div>
    <div class="total-bubble">{{ sumTotal }}</div>
  </section>
</template>

<style lang="scss" scoped>
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

    color: $txPositive;
  }
}

.total-bubble {
  background-color: $bgPrimary;
  border: 1px solid $boxDarkOutline;
  padding: $xxxxs $xxs;
  border-radius: $md;
}
</style>