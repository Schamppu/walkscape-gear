<script setup lang="ts">
import { computed } from "vue";
import ExpandableValueBubble from "../ExpandableValueBubble.vue";
import {
  injectLootTables,
  type BaseContext,
} from "@/composables/context/injectShared";
import { useLootTables, type LootTablesContext } from "@/composables/useLootTables";
import {
  computeTokenTotal,
  buildTokenBreakdown,
} from "@/domain/drops/aggregateDropValue";
import { tokenValues } from "@/domain/constants/tokenValues";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";

const props = withDefaults(
  defineProps<{ context?: BaseContext | null }>(),
  { context: null },
);

const { dropItemInfoMap } = props.context
  ? useLootTables(props.context as unknown as LootTablesContext)
  : injectLootTables();

const tokenTotal = computed(() => computeTokenTotal(dropItemInfoMap.value, tokenValues));
const tokenBreakdown = computed(() => buildTokenBreakdown(dropItemInfoMap.value, tokenValues));

const displayValue = computed(() => n(tokenTotal.value, 2));
const tooltip = computed(() => `${displayValue.value} adventurer's guild tokens per 1k steps`);
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
