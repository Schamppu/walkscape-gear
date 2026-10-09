/**
 * Purpose:
 * Decides which `X / Y` targets are offered for the selected activity or recipe.
 *
 * Invalid combinations are filtered out of the UI dropdowns rather than shown
 * as disabled options.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly; callers build the `TargetContext`.
 * - Extract target values from skill modifiers (not implemented yet).
 */

import { X_VALUES, Y_VALUES } from "./config";
import type { Target, XValue, YValue } from "./config";
import type { LootTableRef } from "@/domain/types/common";
import type { RecipeDetail } from "@/domain/types/recipe";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TargetContext = {
  isRecipe: boolean;
  /** The recipe's main reward is a crafted (quality-aware) item. */
  producesCraftedItem: boolean;
  hasChests: boolean;
  hasCollectibles: boolean;
  hasFineMaterials: boolean;
};

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// Values without a rule are always valid.
const X_RULES: Partial<Record<XValue, (ctx: TargetContext) => boolean>> = {
  fineMaterials: (ctx) => ctx.hasFineMaterials,
  chests: (ctx) => ctx.hasChests,
  collectibles: (ctx) => ctx.hasCollectibles,
  eternalCrafts: (ctx) => ctx.isRecipe && ctx.producesCraftedItem,
};

// `action` is always valid: buff durations can be counted in actions.
const Y_RULES: Partial<Record<YValue, (ctx: TargetContext) => boolean>> = {
  material: (ctx) => ctx.isRecipe,
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export const validXValues = (ctx: TargetContext): XValue[] =>
  X_VALUES.filter((x) => X_RULES[x]?.(ctx) ?? true);

export const validYValues = (ctx: TargetContext): YValue[] =>
  Y_VALUES.filter((y) => Y_RULES[y]?.(ctx) ?? true);

export const isTargetValid = ({ x, y }: Target, ctx: TargetContext): boolean =>
  validXValues(ctx).includes(x) && validYValues(ctx).includes(y);

/** Valid Y values for `x` that no target in `others` already uses. */
export const availableYValues = (
  x: XValue,
  others: readonly Target[],
  ctx: TargetContext,
): YValue[] => validYValues(ctx).filter((y) => !others.some((t) => t.x === x && t.y === y));

/** Valid X values that still have at least one Y not used by `others`. */
export const availableXValues = (
  others: readonly Target[],
  ctx: TargetContext,
): XValue[] => validXValues(ctx).filter((x) => availableYValues(x, others, ctx).length > 0);

/**
 * Returns the target a new row starts with, with weight 0 so it doesn't
 * change the result until the user weights it.
 *
 * Prefers the first X no row uses yet, paired with the first valid Y (`step`).
 * Once every X is used, falls back to the first free pair, trying each Y
 * across all Xs before moving on to the next Y.
 * Returns `null` when every valid pair is already used.
 */
export const nextUnusedTarget = (
  targets: readonly Target[],
  ctx: TargetContext,
): Target | null => {
  const xs = validXValues(ctx);
  const ys = validYValues(ctx);

  const unusedX = xs.find((x) => !targets.some((t) => t.x === x));
  if (unusedX) return { x: unusedX, y: ys[0], weight: 0 };

  for (const y of ys) {
    for (const x of xs) {
      if (!targets.some((t) => t.x === x && t.y === y)) return { x, y, weight: 0 };
    }
  }
  return null;
};

/** Reads which special loot tables an activity or recipe rolls on. */
export const sourceTableFlags = (
  tables: readonly LootTableRef[] | null | undefined,
): Pick<TargetContext, "hasChests" | "hasCollectibles"> => ({
  hasChests: (tables ?? []).some(({ type }) => type.includes("chestTable")),
  hasCollectibles: (tables ?? []).some(({ type }) => type.includes("collectible")),
});

/** True when the recipe's main reward item has type `crafted`. */
export const recipeProducesCraftedItem = (
  recipe: Pick<RecipeDetail, "itemRewards">,
  typeOf: (itemId: string) => string | undefined,
): boolean => {
  const [mainId] = Object.keys(recipe.itemRewards ?? {});
  return mainId !== undefined && typeOf(mainId) === "crafted";
};
