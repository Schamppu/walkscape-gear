import { storeToRefs } from "pinia";
import {
  activityOptimiserPriorities,
  qoRecipeOptimiserPriorities,
  recipeOptimiserPriorities,
} from "@/constants/settings";
import type { SettingOption } from "@/constants/settings";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import useBaseContext from "@/composables/context/useBaseContext";
import { RecipeDetail } from "@/domain/types";

export const selectedPriority = (): SettingOption => {
  const baseCtx = useBaseContext();
  const settingsStore = useSettingsStore();
  const itemsStore = useItemsStore();
  const { gearSettings } = storeToRefs(settingsStore);

  const isRecipe = baseCtx.recipeSelected.value;
  if (!isRecipe) {
    return activityOptimiserPriorities[
      gearSettings.value.activityOptimiserPriority.display
    ];
  }

  const recipe = baseCtx.source.value as RecipeDetail;
  const isQoRecipe = Object.keys(recipe.itemRewards).some(
    (item) => !(item in itemsStore.materials),
  );

  return isQoRecipe
    ? qoRecipeOptimiserPriorities[
        gearSettings.value.qoRecipeOptimiserPriority.display
      ]
    : recipeOptimiserPriorities[
        gearSettings.value.recipeOptimiserPriority.display
      ];
};

export const priorityValue = (): string => selectedPriority().value;

export const priorityName = (): string => selectedPriority().name;
