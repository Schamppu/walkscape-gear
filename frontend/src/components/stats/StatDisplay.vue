<script setup>
import { computed } from "vue";
import { checkRequirements } from "@/utils/requirements";
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  stat: {
    type: Object,
    required: true,
  },
  attrs: Array,
  isPercent: Boolean,
  data: Object,
});

const sumStats = (stats) => {
  return stats.reduce((a, { value: b }) => a + b, 0);
};

const attrStats = computed(() => {
  return props.attrs.map(({ stats }) => stats[0]);
});

const sumTotal = computed(() => {
  const total = sumStats(attrStats.value);
  const value = Math.round(props.isPercent ? 100 * total : total);
  return props.isPercent ? `${value}%` : value;
});

const sumApplicable = computed(() => {
  const applicableAttrs = props.attrs
    .filter(({ requirements }) => checkRequirements(requirements, props.data))
    .map(({ stats }) => stats[0]);
  const total = sumStats(applicableAttrs);
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