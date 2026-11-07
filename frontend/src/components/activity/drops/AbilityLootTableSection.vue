<script setup>
import { computed } from "vue";
import WsIcon from "@/components/primitives/WsIcon.vue";
import WsExpandable from "@/components/primitives/WsExpandable.vue";
import DropItemDisplay from "./DropItemDisplay.vue";
import { icons } from "@/constants/iconPaths";
import { n } from "@/utils/number";

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
});

const dropItems = computed(() => Object.values(props.section.dropInfoMap));

// Time-based cooldowns have no meaningful steps figure.
const hideSteps = computed(() => props.section.stepsPerActivation === null);

// Complete-actions abilities carry `count` (actions completed per activation)
// and optionally a partial fine share (e.g. Flambé's fine recipe outcome).
const isCompleteActions = computed(() => props.section.count > 0);
const showFineShare = computed(
  () => props.section.fineShare > 0 && props.section.fineShare < 1,
);
</script>

<template>
  <ws-expandable
    :aria-label="`${section.name} loot table`"
    class="ability-loot-table"
  >
    <template #header>
      <div class="ability-header">
        <ws-icon :icon-path="section.icon" size="sm" />
        <span class="ability-name">{{ section.name }}</span>
        <span v-if="isCompleteActions" class="roll-amount">
          ×{{ section.count }} actions
        </span>
        <span v-else-if="section.rollAmount > 1" class="roll-amount">
          ×{{ section.rollAmount }}
        </span>
        <span v-if="showFineShare" class="fine-share border-fine">
          {{ n(section.fineShare * 100, 2) }}% fine
        </span>
        <span v-if="!hideSteps" class="steps-per-use">
          <ws-icon :icon-path="icons.steps" size="xs" />
          {{ n(section.stepsPerActivation, 0) }}
        </span>
      </div>
    </template>
    <div class="ability-loot-table">
      <drop-item-display
        v-for="info in dropItems"
        :key="info.id"
        :item-id="info.id"
        :drop-info="info"
        :hide-steps="hideSteps"
      />
    </div>
  </ws-expandable>
</template>

<style lang="scss" scoped>
.ability-loot-table {
  display: flex;
  flex-wrap: wrap;
  gap: $sm;

  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  padding: 0;

  :deep(.ws-expandable__header) {
    box-sizing: border-box;
    border: 1px solid $boxDarkOutline;
    background-color: $boxDarkBackground;
    padding: $sm;
    border-radius: $sm;
  }
}

.ability-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  column-gap: $xs;
  row-gap: $xxxxs;
  min-width: 0;
  flex: 1;
  text-align: left;

  // Short labels stay whole and move to the next line as a unit; only a long
  // ability name may wrap within itself.
  > *:not(.ability-name) {
    white-space: nowrap;
  }
}

.ability-name {
  font-weight: 500;
}

.fine-share {
  padding: 0 $xxxs;
  border-radius: $sm;
  font-size: 0.75rem;
}

.steps-per-use {
  display: flex;
  align-items: center;
  gap: $xxxxs;
}
</style>
