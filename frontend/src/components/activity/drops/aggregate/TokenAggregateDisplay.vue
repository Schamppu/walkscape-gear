<script setup lang="ts">
import { computed } from "vue";
import ExpandableValueBubble from "../ExpandableValueBubble.vue";
import {
  injectLootTables,
  type BaseContext,
} from "@/composables/context/injectShared";
import {
  useLootTables,
  type LootTablesContext,
} from "@/composables/useLootTables";
import {
  computeTokenTotal,
  buildTokenBreakdown,
} from "@/domain/drops/aggregateDropValue";
import { tokenValues } from "@/domain/constants/tokenValues";
import { completeActionsDropValue } from "@/domain/abilities/completeActions";
import type { CompleteActionsAbilityInfo } from "@/composables/useCompleteActionsAbilities";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";

const props = withDefaults(
  defineProps<{
    context?: BaseContext | null;
    completeActionsAbilities?: CompleteActionsAbilityInfo[];
  }>(),
  { context: null, completeActionsAbilities: () => [] },
);

const { dropItemInfoMap } = props.context
  ? useLootTables(props.context as unknown as LootTablesContext)
  : injectLootTables();

const baseTokenTotal = computed(() =>
  computeTokenTotal(dropItemInfoMap.value, tokenValues),
);

// Extra tokens from abilities that instantly complete actions.
const abilityLines = computed(() =>
  props.completeActionsAbilities
    .map((ability) => ({
      icon: ability.icon,
      label: ability.name,
      value: completeActionsDropValue(ability.scale, baseTokenTotal.value),
    }))
    .filter((line) => line.value !== 0),
);

const tokenTotal = computed(
  () =>
    baseTokenTotal.value +
    abilityLines.value.reduce((sum, line) => sum + line.value, 0),
);
const tokenBreakdown = computed(() => [
  ...buildTokenBreakdown(dropItemInfoMap.value, tokenValues),
  ...abilityLines.value,
]);

const displayValue = computed(() => n(tokenTotal.value, 2));
const tooltip = computed(
  () => `${displayValue.value} adventurer's guild tokens per 1k steps`,
);
</script>

<template>
  <expandable-value-bubble
    v-if="displayValue !== '0'"
    :text="displayValue"
    :icon-path="icons.token"
    :tooltip="tooltip"
    :breakdown="tokenBreakdown"
  />
</template>
