/**
 * Purpose:
 * Pure helpers for abilities that instantly complete actions of the current
 * activity / recipe via a `completeActions` action (e.g. "Flambé",
 * "Down Go The Trees"). One activation completes `count` actions, so every
 * per-step rate of the current context is scaled by a factor
 * `k = count · stepsPerCompletion / stepsPerActivation`.
 *
 * Some of these abilities also carry an `effect` that applies only to the
 * completed actions — Flambé's `fineMaterialOutcome` gives each completed
 * recipe a chance to produce fine output from normal materials.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access stores or perform side effects.
 */

import type { AbilityDetail } from "@/domain/types/ability";
import type { Attribute } from "@/domain/types/item";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import { abilityAttributes } from "@/domain/abilities/petAbilityAttrs";
import {
  computeRecipeValue,
  type RecipeValueParams,
} from "@/domain/drops/aggregateDropValue";

/** Stat type of the "fine recipe outcome" stat (Flambé). */
export const FINE_RECIPE_OUTCOME_TYPE = "fineMaterialOutcome";

export type CompleteActionsSpec = {
  /** Number of actions completed per activation. */
  count: number;
};

/**
 * Extracts the `completeActions` spec from an ability's action data, summing
 * the counts of all such actions. Returns `null` for abilities that don't
 * complete actions.
 */
export function extractCompleteActionsSpec(
  detail: Pick<AbilityDetail, "data"> | null | undefined,
): CompleteActionsSpec | null {
  let count = 0;
  for (const dataBlock of detail?.data ?? []) {
    for (const action of dataBlock.actions ?? []) {
      if (action.type === "completeActions" && action.count > 0) {
        count += action.count;
      }
    }
  }
  return count > 0 ? { count } : null;
}

/**
 * Sums the fine-recipe-outcome chance (fraction, 0–1) the ability's own
 * attributes grant, counting only attributes whose requirements pass. Capped
 * at 1.
 */
export function abilityFineRecipeOutcome(
  detail: Pick<AbilityDetail, "attributes" | "data"> | null | undefined,
  passes: (requirements: Attribute["requirements"]) => boolean,
): number {
  let chance = 0;
  for (const attr of abilityAttributes(detail)) {
    const stats = (attr.stats ?? []).filter(
      (s): s is NonNullable<typeof s> => s?.type === FINE_RECIPE_OUTCOME_TYPE,
    );
    if (!stats.length || !passes(attr.requirements ?? [])) continue;
    for (const stat of stats) chance += stat.value;
  }
  return Math.min(1, Math.max(0, chance));
}

/**
 * Per-step rate multiplier contributed by the ability: `count` extra
 * completions every `stepsPerActivation` steps, relative to the context's
 * normal completion cadence. Returns 0 for invalid inputs.
 */
export function completeActionsScale(
  count: number,
  stepsPerCompletion: number,
  stepsPerActivation: number | null,
): number {
  if (!stepsPerActivation || stepsPerActivation <= 0) return 0;
  if (!(count > 0) || !(stepsPerCompletion > 0)) return 0;
  return (count * stepsPerCompletion) / stepsPerActivation;
}

/** Divides a steps figure by the scale, keeping 0 ("not applicable") as 0. */
function scaleSteps(steps: number, scale: number): number {
  return steps > 0 && Number.isFinite(steps) ? steps / scale : 0;
}

/**
 * Rescales one drop info entry by `scale` (rates × scale ⇔ steps ÷ scale).
 * Chance, counts and sources are unchanged.
 */
export function scaleDropInfo(info: DropItemInfo, scale: number): DropItemInfo {
  return {
    ...info,
    stepsPerItem: scaleSteps(info.stepsPerItem, scale),
    itemsPerStep: info.itemsPerStep * scale,
    stepsPerNormal: scaleSteps(info.stepsPerNormal, scale),
    stepsPerFine: scaleSteps(info.stepsPerFine, scale),
    stepsPerRare: scaleSteps(info.stepsPerRare, scale),
  };
}

/** Rescales every entry of a drop info map by `scale`. */
export function scaleDropInfoMap(
  map: Record<string, DropItemInfo>,
  scale: number,
): Record<string, DropItemInfo> {
  if (scale <= 0) return {};
  return Object.fromEntries(
    Object.entries(map).map(([id, info]) => [id, scaleDropInfo(info, scale)]),
  );
}

export type RecipeOutputDropInfoParams = {
  itemRewards: Record<string, number>;
  /** Context steps per reward roll (unscaled). */
  stepsPerRewardRoll: number;
  /** Ability rate scale (see `completeActionsScale`). */
  scale: number;
  /** Fraction (0–1) of output that is fine. */
  fineShare: number;
  /** Items that can exist as fine. */
  fineMaterialIds: Record<string, boolean>;
  /** Item ids of crafted gear (quality tiers, never a normal/fine split). */
  craftedGearIds: Record<string, unknown>;
  iconOf: (id: string) => string | undefined;
};

/**
 * Builds drop info entries for a recipe's item rewards as produced by the
 * ability's completed actions, split into normal/fine by `fineShare` for
 * items that can be fine.
 */
export function buildRecipeOutputDropInfo(
  params: RecipeOutputDropInfoParams,
): Record<string, DropItemInfo> {
  const {
    itemRewards,
    stepsPerRewardRoll,
    scale,
    fineShare,
    fineMaterialIds,
    craftedGearIds,
    iconOf,
  } = params;
  if (scale <= 0 || !(stepsPerRewardRoll > 0)) return {};

  const entries = Object.entries(itemRewards)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]): [string, DropItemInfo] => {
      const stepsPerItem = stepsPerRewardRoll / amount / scale;
      const splits = id in fineMaterialIds && !(id in craftedGearIds);
      const share = splits ? fineShare : 0;
      return [
        id,
        {
          id,
          icon: iconOf(id),
          sources: [],
          totalDropChance: 100,
          stepsPerItem,
          itemsPerStep: 1000 / stepsPerItem,
          stepsPerNormal: share < 1 ? stepsPerItem / (1 - share) : 0,
          stepsPerFine: share > 0 ? stepsPerItem / share : 0,
          stepsPerRare: 0,
          dropCounts: `${amount}`,
          variableRequirement: null,
        },
      ];
    });
  return Object.fromEntries(entries);
}

/**
 * Gold value per 1k steps contributed by the ability. Every per-step rate of
 * the context scales linearly by `scale`, so this is the context's drop gold
 * plus — for recipes — its net recipe value re-evaluated with the ability's
 * fine share, all multiplied by `scale`.
 *
 * @param scale       Ability rate scale (see `completeActionsScale`).
 * @param dropGold    Context drop gold per 1k steps (`computeGoldTotal`).
 * @param recipeParams Context recipe params, when a recipe is selected.
 * @param fineShare   Fine share of the completed recipes' output.
 */
export function completeActionsGoldValue(
  scale: number,
  dropGold: number,
  recipeParams: RecipeValueParams | undefined,
  fineShare: number,
): number {
  if (scale <= 0) return 0;
  const recipeValue = recipeParams
    ? computeRecipeValue({ ...recipeParams, fineShare })
    : 0;
  return completeActionsDropValue(scale, dropGold + recipeValue);
}

/**
 * Per-1k-steps value of a plain drop-based total (e.g. tokens) contributed by
 * the ability: the context's value scaled by the ability's rate.
 */
export function completeActionsDropValue(
  scale: number,
  contextValue: number,
): number {
  return scale > 0 ? scale * contextValue : 0;
}
