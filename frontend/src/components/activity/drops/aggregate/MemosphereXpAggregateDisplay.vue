<script setup lang="ts">
import { computed } from "vue";
import ExpandableValueBubble from "../ExpandableValueBubble.vue";
import {
  injectLootTables,
  type BaseContext,
} from "@/composables/context/injectShared";
import { useLootTables, type LootTablesContext } from "@/composables/useLootTables";
import { useMemosphereXp } from "@/composables/useMemosphereXp";
import type { ChestLootTableInfo } from "@/composables/useChestLootTables";
import type { AbilityLootTableInfo } from "@/composables/useAbilityLootTables";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";

const props = withDefaults(
  defineProps<{
    context?: BaseContext | null;
    chestLootTables?: ChestLootTableInfo[];
    abilityLootTables?: AbilityLootTableInfo[];
  }>(),
  { context: null, chestLootTables: () => [], abilityLootTables: () => [] },
);

const { dropItemInfoMap } = props.context
  ? useLootTables(props.context as unknown as LootTablesContext)
  : injectLootTables();

const memosphereXp = useMemosphereXp(
  dropItemInfoMap,
  computed(() => props.chestLootTables),
  computed(() => props.abilityLootTables),
);

const displayValue = computed(() => n(memosphereXp.value.total, 2));
const tooltip = computed(() => `${displayValue.value} XP per step from memospheres`);
</script>

<template>
  <expandable-value-bubble
    v-if="displayValue !== '0'"
    :text="displayValue"
    :icon-path="icons.xp"
    label="/step"
    :tooltip="tooltip"
    :breakdown="memosphereXp.breakdown"
  />
</template>
