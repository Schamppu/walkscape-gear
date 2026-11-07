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
import { useMemosphereXp } from "@/composables/useMemosphereXp";
import type { ChestLootTableInfo } from "@/composables/useChestLootTables";
import type { AbilityLootTableInfo } from "@/composables/useAbilityLootTables";
import type { CompleteActionsAbilityInfo } from "@/composables/useCompleteActionsAbilities";
import { completeActionsXpBreakdown } from "@/domain/abilities/completeActions";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";

const props = withDefaults(
  defineProps<{
    context?: BaseContext | null;
    chestLootTables?: ChestLootTableInfo[];
    abilityLootTables?: AbilityLootTableInfo[];
    completeActionsAbilities?: CompleteActionsAbilityInfo[];
  }>(),
  {
    context: null,
    chestLootTables: () => [],
    abilityLootTables: () => [],
    completeActionsAbilities: () => [],
  },
);

const { dropItemInfoMap } = props.context
  ? useLootTables(props.context as unknown as LootTablesContext)
  : injectLootTables();

const memosphereXp = useMemosphereXp(
  dropItemInfoMap,
  computed(() => props.chestLootTables),
  computed(() => [
    ...props.abilityLootTables,
    ...props.completeActionsAbilities,
  ]),
);

// XP from abilities that instantly complete actions, one line per ability.
const abilityXpLines = computed(() =>
  completeActionsXpBreakdown(props.completeActionsAbilities),
);

const total = computed(
  () =>
    memosphereXp.value.total +
    abilityXpLines.value.reduce((sum, line) => sum + line.value, 0),
);
const breakdown = computed(() => [
  ...memosphereXp.value.breakdown,
  ...abilityXpLines.value,
]);

const displayValue = computed(() => n(total.value, 2));
const tooltip = computed(() =>
  abilityXpLines.value.length
    ? `${displayValue.value} XP per step from memospheres and abilities`
    : `${displayValue.value} XP per step from memospheres`,
);
</script>

<template>
  <expandable-value-bubble
    v-if="displayValue !== '0'"
    :text="displayValue"
    :icon-path="icons.xp"
    label="/step"
    :tooltip="tooltip"
    :breakdown="breakdown"
  />
</template>
