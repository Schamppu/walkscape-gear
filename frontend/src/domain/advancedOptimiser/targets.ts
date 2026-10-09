/**
 * Purpose:
 * Decides which `X / Y` targets are offered for the selected activity or
 * recipe, and extracts a target's value from a gear set's skill modifiers.
 *
 * Invalid combinations are filtered out of the UI dropdowns rather than shown
 * as disabled options.
 *
 * Extraction always works on a whole gear set's `SkillModifiersResult`, never
 * on single items. Work-efficiency caps, the increasing returns of
 * `no_materials_consumed` and keyword set bonuses only show up once the full
 * set is known, so per-item values must not be summed.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly; callers build the `TargetContext` and
 *   `ExtractionContext`.
 */

import { X_VALUES, Y_VALUES } from "./config";
import type { Target, XValue, YValue } from "./config";
import { getOutcomeOdds, type FineMaterialsMode } from "@/domain/quality/qualityOutcomeOdds";
import type { SkillModifiersResult } from "@/domain/skillModifiers";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { TokenValuesMap } from "@/domain/constants/tokenValues";
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

/** Quality inputs for recipes whose main reward is a crafted item. */
export type RecipeQualityContext = {
  levelReq: number;
  fineMode: FineMaterialsMode;
};

/**
 * Per-activity drop rates per reward roll, with every find multiplier at 1.
 * Gear only scales these, so they are computed once per activity.
 */
export type DropProfile = {
  chestsPerRoll: number;
  /** Token value per roll if every token item dropped as common. */
  tokenBasePerRoll: number;
  /** Extra token value per roll per unit of fine chance (fine − common value). */
  tokenFineBonusPerRoll: number;
};

export type ExtractionContext = {
  modifiers: SkillModifiersResult;
  /** Skills the activity / recipe rewards XP in. XP for other skills doesn't count. */
  activitySkills: readonly string[];
  /** Only for recipes that produce a crafted item. */
  quality: RecipeQualityContext | null;
  drops: DropProfile;
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

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/** Returns `value` when it is a finite number, otherwise 0. */
const finiteOrZero = (value: number): number => (Number.isFinite(value) ? value : 0);

/** Probability of an Eternal outcome per craft, or 0 without quality inputs. */
const eternalChance = (m: SkillModifiersResult, quality: RecipeQualityContext | null): number => {
  if (!quality) return 0;
  const odds = getOutcomeOdds(quality.levelReq, m.qualityOutcome, quality.fineMode);
  return odds[odds.length - 1]?.value ?? 0;
};

/** How much of `x` one action yields. */
const perAction = (x: XValue, ctx: ExtractionContext): number => {
  const { modifiers: m, drops } = ctx;
  const rolls = 1 + m.doubleRewards;

  switch (x) {
    case "xp":
      return m.xpRewards
        .filter(({ skill }) => ctx.activitySkills.includes(skill))
        .reduce((sum, { value }) => sum + value, 0);
    case "rewardRolls":
      return rolls;
    case "fineMaterials":
      return rolls * m.fineMaterialFind;
    case "collectibles":
      return rolls * m.findCollectibles;
    case "chests":
      return rolls * m.chestFind * drops.chestsPerRoll;
    case "tokens":
      return rolls * (drops.tokenBasePerRoll + drops.tokenFineBonusPerRoll * m.fineMaterialFind);
    case "eternalCrafts":
      return rolls * eternalChance(m, ctx.quality);
  }
};

/**
 * How many `y` one action takes. Double actions consume materials too, so a
 * material set is used per action unless `no_materials_consumed` procs.
 */
const yPerAction = (y: YValue, m: SkillModifiersResult): number => {
  switch (y) {
    case "step":
      return m.stepsPerAction;
    case "action":
      return 1;
    case "material":
      return 1 - m.noMaterialsConsumed;
  }
};

/**
 * Value of target `x / y` for the gear set the modifiers were computed from.
 * Higher is always better. Returns 0 rather than NaN / Infinity.
 */
export const extracted = (x: XValue, y: YValue, ctx: ExtractionContext): number => {
  const divisor = yPerAction(y, ctx.modifiers);
  if (!(divisor > 0)) return 0;
  return finiteOrZero(perAction(x, ctx) / divisor);
};

/**
 * Builds a `DropProfile` from a drop map computed with
 * `buildDropItemInfoMap(drops, 1, 1, () => 1, …)`, so each item's
 * `1 / stepsPerItem` is its count per reward roll.
 *
 * @param dropItemInfoMap Drop info keyed by item id, at 1 step per roll.
 * @param containers      Chest item ids (as in `identifyChestItems`).
 * @param tokens          Token value per item id.
 */
export const buildDropProfile = (
  dropItemInfoMap: Record<string, Pick<DropItemInfo, "stepsPerItem" | "stepsPerFine">>,
  containers: Record<string, unknown>,
  tokens: TokenValuesMap,
): DropProfile => {
  const profile: DropProfile = { chestsPerRoll: 0, tokenBasePerRoll: 0, tokenFineBonusPerRoll: 0 };

  for (const [id, { stepsPerItem, stepsPerFine }] of Object.entries(dropItemInfoMap)) {
    const perRoll = finiteOrZero(1 / stepsPerItem);
    if (perRoll <= 0) continue;

    if (id in containers) profile.chestsPerRoll += perRoll;

    const token = tokens[id];
    if (token) {
      profile.tokenBasePerRoll += perRoll * token.common;
      if (stepsPerFine && token.fine !== undefined) {
        profile.tokenFineBonusPerRoll += perRoll * (token.fine - token.common);
      }
    }
  }

  return profile;
};
