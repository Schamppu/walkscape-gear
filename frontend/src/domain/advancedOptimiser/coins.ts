/**
 * Purpose:
 * The `coins` target: coin value an action earns, valued like the drops
 * panel's money total (`aggregateDropValue.ts`).
 *
 * - Drops: each item's sell value (gold counts 1 each), with fine variants at
 *   their fine value. Drops from chest, collectible, gem and bird nest tables
 *   are scaled by the matching find bonus.
 * - Recipes: net value. Crafted output across the quality odds plus material
 *   rewards, minus the materials consumed (one set per action unless
 *   "no materials consumed" procs). Net coins can be negative.
 *
 * Everything that gear doesn't change is precomputed per activity into a
 * `CoinProfile`; `coinsPerAction` applies a gear set's modifiers.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or access stores.
 */

import { getOutcomeOdds, type FineMaterialsMode } from "@/domain/quality/qualityOutcomeOdds";
import type { SkillModifiersResult } from "@/domain/skillModifiers";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Loot table types that a find bonus scales (see `resolveDropMultiplier`). */
export const FIND_GROUPS = ["chestTable", "collectible", "gem", "birdNest"] as const;
export type FindGroup = (typeof FIND_GROUPS)[number];

/** Coin value per reward roll of the drops from tables with the same find bonuses. */
export type CoinDropGroup = {
  /** Find bonuses that scale these drops (empty: none). */
  finds: FindGroup[];
  /** Value per roll if every drop were common. */
  basePerRoll: number;
  /** Extra value per roll per unit of fine chance (fine − common value). */
  fineBonusPerRoll: number;
};

export type RecipeCoins = {
  /** Crafted output value per reward roll, by quality tier (value × amount). */
  craftedPerRoll: Record<string, number>;
  /** Value of non-crafted outputs per reward roll. */
  materialRewardPerRoll: number;
  /** Value of one set of input materials, consumed per action unless NMC procs. */
  materialCostPerAction: number;
};

export type CoinProfile = {
  drops: CoinDropGroup[];
  recipe: RecipeCoins | null;
};

type PerRollDropMap = Record<string, Pick<DropItemInfo, "stepsPerItem" | "stepsPerFine">>;

type ValueMap = Record<string, Record<string, number | undefined>>;

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const findMultiplier = (find: FindGroup, m: SkillModifiersResult): number => {
  switch (find) {
    case "chestTable":
      return m.chestFind;
    case "collectible":
      return m.findCollectibles;
    case "gem":
      return m.findGems;
    case "birdNest":
      return m.findBirdNests;
  }
};

/** Expected crafted output value per reward roll at the set's quality outcome. */
const craftedValuePerRoll = (
  craftedPerRoll: Record<string, number>,
  m: SkillModifiersResult,
  quality: { levelReq: number; fineMode: FineMaterialsMode } | null,
): number => {
  if (!Object.keys(craftedPerRoll).length) return 0;
  if (!quality) return craftedPerRoll.common ?? 0;
  return getOutcomeOdds(quality.levelReq, m.qualityOutcome, quality.fineMode).reduce(
    (sum, { qualityValue, value }) => sum + value * (craftedPerRoll[qualityValue] ?? 0),
    0,
  );
};

/** Net coin value per action for a gear set's modifiers. */
export const coinsPerAction = (
  coins: CoinProfile | undefined,
  m: SkillModifiersResult,
  quality: { levelReq: number; fineMode: FineMaterialsMode } | null,
): number => {
  if (!coins) return 0;
  const rolls = 1 + m.doubleRewards;

  const dropsPerRoll = coins.drops.reduce((sum, { finds, basePerRoll, fineBonusPerRoll }) => {
    const multiplier = finds.reduce((product, find) => product * findMultiplier(find, m), 1);
    return sum + multiplier * (basePerRoll + fineBonusPerRoll * m.fineMaterialFind);
  }, 0);

  const recipe = coins.recipe;
  const recipePerAction = recipe
    ? rolls *
        (craftedValuePerRoll(recipe.craftedPerRoll, m, quality) + recipe.materialRewardPerRoll) -
      recipe.materialCostPerAction * (1 - m.noMaterialsConsumed)
    : 0;

  return rolls * dropsPerRoll + recipePerAction;
};

// ---------------------------------------------------------------------------
// Profile builders
// ---------------------------------------------------------------------------

/** The find bonuses that apply to a loot table with these types. */
export const findGroupsOf = (types: readonly string[]): FindGroup[] =>
  FIND_GROUPS.filter((find) => types.includes(find));

/**
 * Coin value per roll for each group of drops, from drop maps computed with
 * `buildDropItemInfoMap(drops, 1, 1, () => 1, …)` per find-bonus group.
 *
 * @param groups       Drop map of each group of tables sharing find bonuses.
 * @param gearQuality  Quality of each gear item (gear sells at that quality).
 * @param itemValues   Sell value per item id and quality / fine.
 */
export const buildCoinDrops = (
  groups: { finds: FindGroup[]; dropMap: PerRollDropMap }[],
  gearQuality: Record<string, string>,
  itemValues: ValueMap,
): CoinDropGroup[] =>
  groups
    .map(({ finds, dropMap }) => {
      let basePerRoll = 0;
      let fineBonusPerRoll = 0;
      for (const [id, { stepsPerItem, stepsPerFine }] of Object.entries(dropMap)) {
        const perRoll = 1 / stepsPerItem;
        if (!Number.isFinite(perRoll) || perRoll <= 0) continue;

        if (id === "gold") {
          basePerRoll += perRoll;
        } else if (id in gearQuality && id in itemValues) {
          basePerRoll += perRoll * (itemValues[id][gearQuality[id]] ?? 0);
        } else if (id in itemValues) {
          const common = itemValues[id].common ?? 0;
          basePerRoll += perRoll * common;
          const fine = itemValues[id].fine;
          if (stepsPerFine && fine !== undefined) fineBonusPerRoll += perRoll * (fine - common);
        }
      }
      return { finds, basePerRoll, fineBonusPerRoll };
    })
    .filter(({ basePerRoll, fineBonusPerRoll }) => basePerRoll !== 0 || fineBonusPerRoll !== 0);

/**
 * A recipe's coin values, valued like `computeRecipeValue`: crafted rewards by
 * quality tier, material rewards at fine value when fine inputs are used, and
 * the first option of each material group as the cost.
 */
export const buildRecipeCoins = ({
  materials,
  itemRewards,
  isGear,
  isCrafted,
  itemValues,
  useFine,
}: {
  materials: { options: { item: string; amount: number }[] }[];
  itemRewards: Record<string, number>;
  isGear: (id: string) => boolean;
  isCrafted: (id: string) => boolean;
  itemValues: ValueMap;
  useFine: boolean;
}): RecipeCoins => {
  const craftedPerRoll: Record<string, number> = {};
  let materialRewardPerRoll = 0;

  for (const [item, amount] of Object.entries(itemRewards)) {
    const values = itemValues[item] ?? {};
    if (isCrafted(item)) {
      for (const [quality, value] of Object.entries(values)) {
        craftedPerRoll[quality] = (craftedPerRoll[quality] ?? 0) + amount * (value ?? 0);
      }
    } else {
      materialRewardPerRoll += amount * ((useFine ? values.fine : values.common) ?? 0);
    }
  }

  const materialCostPerAction = materials
    .map(({ options }) => options[0])
    .filter(Boolean)
    .reduce((sum, { item, amount }) => {
      const values = itemValues[item] ?? {};
      const value = isGear(item)
        ? Object.values(values)[0]
        : useFine
          ? values.fine
          : values.common;
      return sum + amount * (value ?? 0);
    }, 0);

  return { craftedPerRoll, materialRewardPerRoll, materialCostPerAction };
};
