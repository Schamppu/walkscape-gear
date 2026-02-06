import { storeToRefs } from "pinia";
import {
  activityOptimiserPriorities,
  recipeOptimiserPriorities,
} from "@/constants/optimiserPriorities";
import { useSettingsStore } from "@/store/settings";
import useBaseContext from "@/composables/context/useBaseContext";

export const selectedPriority = () => {
  const baseCtx = useBaseContext();
  const settingsStore = useSettingsStore();
  const { gearSettings } = storeToRefs(settingsStore);

  return baseCtx.recipeSelected.value
    ? recipeOptimiserPriorities[
        gearSettings.value.recipeOptimiserPriority.display
      ]
    : activityOptimiserPriorities[
        gearSettings.value.activityOptimiserPriority.display
      ];
};

export const priorityValue = () => {
  return selectedPriority().value;
};

export const priorityName = () => {
  return selectedPriority().name;
};
