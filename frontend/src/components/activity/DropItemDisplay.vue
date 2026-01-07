<script setup>
import { computed } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import useBaseContext from "@/composables/useBaseContext";
import { useLootTables } from "@/composables/useLootTables";
import { icons } from "@/constants/iconPaths";
import { n } from "@/utils/number";

const props = defineProps({
  itemId: String,
});

const ctx = useBaseContext();

const { dropItemInfoMap } = useLootTables(ctx);
const item = computed(() => dropItemInfoMap.value[props.itemId]);
</script>

<template>
  <div
    v-if="item?.id"
    class="drop-item-display"
    :class="{ disabled: !item.totalDropChance }"
    :title="item.isMoney ? 'Gold' : item.name"
    :aria-label="item.isMoney ? 'Gold' : item.name"
  >
    <ws-icon :icon-path="item.icon" size="md" />
    <span>{{ n(item.totalDropChance, 3) }}%</span>
    <span>{{ item.dropCounts }}</span>
    <div v-if="item.totalDropChance > 0" class="step-counts">
      <div v-if="item.id === 'gold'" class="steps-line">
        <span>{{ n(item.itemsPerStep, 0) }}</span>
        /
        <span>1k</span>
        <ws-icon :iconPath="icons.steps" size="xs" />
      </div>
      <div v-else class="steps-line border-common">
        <ws-icon :iconPath="icons.steps" size="xs" />
        <span>{{
          item.stepsPerItem < 100
            ? n(item.stepsPerItem, 1)
            : n(item.stepsPerItem, 0)
        }}</span>
      </div>
      <div v-if="item.stepsPerFine > 0" class="steps-line border-fine">
        <ws-icon :iconPath="icons.steps" size="xs" />
        <span>{{ n(item.stepsPerFine, 0) }}</span>
      </div>
    </div>
    <div v-else-if="item.variableRequirement" class="requirement-row">
      <span> At </span>
      <ws-icon :icon-path="item.variableRequirement.icon" size="xs" />
      <span>
        {{ item.variableRequirement.levelRequirement }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.drop-item-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  padding-top: $xxs;
  gap: $xxxxs;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;

  font-size: 0.75rem;

  &.disabled {
    opacity: 0.5;
  }
}

.step-counts {
  min-width: 50px;
  display: flex;
  flex-direction: column;

  .steps-line {
    display: flex;
    align-items: center;
    border-radius: $sm;
    padding: $xxxxs;
    width: 100%;
    box-sizing: border-box;
  }
}

.requirement-row {
  display: flex;
  gap: $xxxs;
}
</style>
