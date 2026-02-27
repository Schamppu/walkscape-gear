/**
 * Purpose:
 * Lists of optimiser priority options used by settings UI.
 *
 * Responsibilities:
 * - Provide typed lists for activity and recipe optimiser dropdowns
 * - Keep labels and values centralized for settings and store logic
 */

import { SettingOption } from "./types";

export const activityOptimiserPriorities: SettingOption[] = [
  { value: "balanced", name: "Balanced" },
  { value: "stepsPerRewardRoll", name: "Reward roll" },
  { value: "xpPerStep", name: "XP per step" },
  { value: "stepsPerFineRoll", name: "Steps per fine roll" },
  { value: "stepsPerCollectibleRoll", name: "Steps per collectible roll" },
];

export const recipeOptimiserPriorities: SettingOption[] = [
  { value: "balancedRecipe", name: "Balanced" },
  { value: "craftsPerMaterial", name: "Crafts per Material" },
  { value: "averageEternalCrafts", name: "Average Eternal Mats" },
  { value: "xpPerStep", name: "XP per step" },
];

export default {
  activityOptimiserPriorities,
  recipeOptimiserPriorities,
};
