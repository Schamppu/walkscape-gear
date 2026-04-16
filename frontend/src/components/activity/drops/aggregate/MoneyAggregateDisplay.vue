<script setup lang="ts">
import { computed } from "vue";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";
import ExpandableValueBubble from "../ExpandableValueBubble.vue";
import {
  injectBaseContext,
  injectLootTables,
  injectSkillModifiers,
  injectFineMaterials,
  type BaseContext,
} from "@/composables/context/injectShared";
import { useLootTables, type LootTablesContext } from "@/composables/useLootTables";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { useFineMaterials, type FineMaterialsContext } from "@/composables/useFineMaterialsCalculations";
import type { RecipeDetail } from "@/domain/types/recipe";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import {
  computeGoldTotal,
  computeRecipeValue,
  buildGoldBreakdown,
  type RecipeValueParams,
} from "@/domain/drops/aggregateDropValue";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";

const props = withDefaults(
  defineProps<{ context?: BaseContext | null }>(),
  { context: null },
);

const ctx = props.context || injectBaseContext();
const { dropItemInfoMap } = props.context
  ? useLootTables(props.context as unknown as LootTablesContext)
  : injectLootTables();

const dataStore = useDataStore();
const itemsStore = useItemsStore();
const {
  stepsPerRewardRoll,
  stepsPerAction,
  noMaterialsConsumed,
  qualityOutcome,
} = props.context
  ? useSkillModifiers(props.context as unknown as SkillModifiersContext)
  : injectSkillModifiers();
const { useFine, fineMode } = props.context
  ? useFineMaterials(props.context as unknown as FineMaterialsContext)
  : injectFineMaterials();

const recipeParams = computed((): RecipeValueParams | undefined => {
  if (!ctx.recipeSelected.value) return undefined;

  const { materials, itemRewards } = ctx.source.value as RecipeDetail;
  const recipe = ctx.recipe.value as RecipeDetail;
  const levelMap = getLevelRequirementsMap(recipe.requirements);
  const level = Object.values(levelMap)[0];
  const craftingOdds = getOutcomeOdds(level, qualityOutcome.value, fineMode.value);

  return {
    materials,
    itemRewards,
    stepsPerRewardRoll: stepsPerRewardRoll.value,
    stepsPerAction: stepsPerAction.value,
    noMaterialsConsumed: noMaterialsConsumed.value,
    useFine: useFine.value,
    allGearItems: itemsStore.allGearItems,
    itemValues: dataStore.itemValues,
    craftingOdds,
  };
});

const recipeValue = computed(() =>
  recipeParams.value ? computeRecipeValue(recipeParams.value) : 0
);

const goldTotal = computed(() =>
  computeGoldTotal(dropItemInfoMap.value, itemsStore.allGearItems, dataStore.itemValues)
);

const goldBreakdown = computed(() =>
  buildGoldBreakdown(
    dropItemInfoMap.value,
    itemsStore.allGearItems,
    itemsStore.materials,
    dataStore.itemValues,
    recipeParams.value,
  )
);

const displayValue = computed(() => n(goldTotal.value + recipeValue.value, 2));
const tooltip = computed(() => `${displayValue.value} money per 1k steps`);
</script>

<template>
  <expandable-value-bubble
    v-if="displayValue !== '0'"
    :text="displayValue"
    :icon-path="icons.money"
    :tooltip="tooltip"
    :breakdown="goldBreakdown"
  />
</template>
