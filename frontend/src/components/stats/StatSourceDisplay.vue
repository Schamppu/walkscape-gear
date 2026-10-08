<script setup lang="ts">
import { computed } from "vue";
import { injectEffectiveAttrs } from "@/composables/context/injectShared";
import WsIcon from "@/components/primitives/WsIcon.vue";
import { n } from "@/utils/number";
import { buildStatSourceList } from "@/domain/stats/statSourceList";
import type { DisplayStat } from "@/domain/types/stat";

const props = defineProps<{
  stat: DisplayStat;
  isPercent?: boolean;
}>();

const { effectiveAttrs, allAttrs } = injectEffectiveAttrs();

const statList = computed(() => {
  const effectiveAttrIds = effectiveAttrs.value.map((attr) => attr.id);
  return buildStatSourceList(allAttrs.value, effectiveAttrIds, props.stat.id, props.isPercent ?? false);
});
</script>

<template>
  <ul>
    <li
      class="li-item"
      v-for="({ item, stat, effective }, index) in statList"
      :key="index"
    >
      <p
        :class="{
          negative: stat.isNegative,
          positive: !stat.isNegative,
          disabled: !effective,
        }"
        class="stat-line"
      >
        <span v-if="stat.isPercent">
          <span v-if="!(stat.value <= 0)">+</span>{{ n(100 * stat.value, 2) }}%
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
        <span
          v-if="item"
          :class="{
            positive: effective,
            negative: !effective,
            disabled: !effective,
          }"
          >{{ item.name }}</span
        >
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
</style>
