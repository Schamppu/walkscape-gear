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
</script>

<template>
  <ws-expandable
    :aria-label="`${section.name} loot table`"
    class="ability-loot-table"
  >
    <template #header>
      <ws-icon :icon-path="section.icon" size="sm" />
      <span class="ability-name">{{ section.name }}</span>
      <span v-if="section.rollAmount > 1" class="roll-amount">
        ×{{ section.rollAmount }}
      </span>
      <span v-if="!hideSteps" class="steps-per-use">
        <ws-icon :icon-path="icons.steps" size="xs" />
        {{ n(section.stepsPerActivation, 0) }}
      </span>
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

.ability-name {
  font-weight: 500;
  margin-left: $xs;
}

.roll-amount {
  margin-left: $xs;
}

.steps-per-use {
  display: flex;
  align-items: center;
  gap: $xxxxs;
  margin-left: $sm;
}
</style>
