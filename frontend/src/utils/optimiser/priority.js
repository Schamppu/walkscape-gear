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
      ].value
    : activityOptimiserPriorities[
        gearSettings.value.activityOptimiserPriority.display
      ].value;
};
