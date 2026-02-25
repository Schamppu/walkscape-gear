import { storeToRefs } from "pinia";
import {
  activityOptimiserPriorities,
  recipeOptimiserPriorities,
} from "@/constants/settings";
import type { SettingOption } from "@/constants/settings";
import { useSettingsStore } from "@/store/settings";
import useBaseContext from "@/composables/context/useBaseContext";

export const selectedPriority = (): SettingOption => {
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

export const priorityValue = (): string => selectedPriority().value;

export const priorityName = (): string => selectedPriority().name;
