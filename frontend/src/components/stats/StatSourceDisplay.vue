<script setup>
import { computed } from "vue";
import { useEffectiveAttrs } from "@/utils/useEffectiveAttrs";
import WsIcon from "@/components/common/WsIcon.vue";
import { n } from "@/utils/number";

const props = defineProps({
  stat: {
    type: Object,
    required: true,
  },
  isPercent: Boolean,
});

const { effectiveAttrs, allAttrs } = useEffectiveAttrs();

const statList = computed(() => {
  const effectiveAttrIds = effectiveAttrs.value.map((attr) => attr.id);

  return allAttrs.value
    .filter((attr) => {
      const { stat: statId, isPercent: percent } = attr.stats[0];
      return statId === props.stat.id && percent === props.isPercent;
    })
    .flatMap(({ stats, item, id }) => {
      return { stat: stats[0], item, effective: effectiveAttrIds.includes(id) };
    });
});
</script>

<template>
  <ul>
    <li
      class="li-item"
      v-for="({ item, stat, effective }, index) in statList"
      :key="index"
    >
      <p :class="stat.isNegative ? 'negative' : 'positive'" class="stat-line">
        <span v-if="stat.isPercent">
          <span v-if="!(stat.value <= 0)">+</span
          >{{ n(100* stat.value, 2) }}%
        </span>
        <span v-else
          ><span v-if="!(stat.value <= 0)">+</span>{{ n(stat.value, 2) }}
        </span>
        <ws-icon
          v-if="item && item.icon"
          :icon-path="item.icon"
          size="sm"
          :outlineClass="`outline-${item.quality}`"
        />
        <span v-if="item" :class="effective ? 'postitive' : 'negative'">{{
          item.name
        }}</span>
      </p>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.li-item {
  list-style-type: none;
}

.stat-line {
  display: flex;
  padding: $sm;
  gap: $xxs;
}

.negative {
  color: $txNegative;
}

.positive {
  color: $txPositive;
}
</style>
