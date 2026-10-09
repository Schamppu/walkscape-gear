import type { Target, XValue, YValue } from "@/domain/advancedOptimiser/config";
import type { TargetContext } from "@/domain/advancedOptimiser/targets";

/** Builds a target row. */
export function makeTarget(x: XValue, y: YValue, weight = 1): Target {
  return { x, y, weight };
}

/** Builds a TargetContext for a plain activity with no special loot tables. */
export function makeTargetContext(overrides: Partial<TargetContext> = {}): TargetContext {
  return {
    isRecipe: false,
    producesCraftedItem: false,
    hasChests: false,
    hasCollectibles: false,
    hasFineMaterials: false,
    ...overrides,
  };
}
