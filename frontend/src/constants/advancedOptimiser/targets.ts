/**
 * Purpose:
 * Display labels for the advanced optimiser's target dropdowns.
 */

import type { XValue, YValue } from "@/domain/advancedOptimiser/config";

export const X_LABELS: Record<XValue, string> = {
  xp: "XP",
  rewardRolls: "Reward rolls",
  fineMaterials: "Fine materials",
  chests: "Chests",
  tokens: "Tokens",
  collectibles: "Collectibles",
  eternalCrafts: "Eternal crafts",
};

export const Y_LABELS: Record<YValue, string> = {
  step: "step",
  material: "material",
  action: "action",
};
