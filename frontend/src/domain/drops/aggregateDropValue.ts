/**
 * Purpose:
 * Pure calculation functions for aggregated drop value display.
 *
 * Responsibilities:
 * - Compute gold/money value per 1k steps from a loot-table drop map.
 * - Compute adventurer's guild token value per 1k steps from a drop map.
 * - Compute net recipe value (reward minus material cost) per 1k steps.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access stores or global state.
 * - Mutate inputs.
 */

import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { ItemValueMap } from "@/domain/types/item";
import type { TokenValuesMap } from "@/domain/constants/tokenValues";
import type { QualityOutcomeResult } from "@/domain/quality/qualityOutcomeOdds";
import type { RecipeMaterial } from "@/domain/types/recipe";
import { all } from "axios";
import { MaterialInfo } from "@/store/items";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The subset of drop/step info needed to resolve a per-step item value.
 * `DropItemInfo` satisfies this shape; plain objects with these two fields
 * can also be passed (e.g. constructed inline for recipe reward items).
 */
export type MaterialValueInfo = {
  stepsPerNormal: number;
  stepsPerFine: number;
};

/**
 * A generic value-source map that associates item ids with at minimum a
 * `common` value and an optional `fine` value.  Both `TokenValuesMap` and
 * the item-values map fetched from the backend satisfy this contract.
 */
export type MaterialValueSource = Record<
  string,
  { common: number; fine?: number }
>;

/**
 * The subset of a gear-item record needed by the gold-total and recipe-value
 * calculations.  `ItemDetail` satisfies this shape.
 */
export type GearItemRef = {
  type: string;
  quality: string;
  icon?: string;
};

/**
 * A single row in a breakdown list for the expandable value display.
 * `value` is per 1k steps; negative values represent costs.
 */
export type BreakdownLine = {
  /** Icon path to display. Undefined when no applicable icon is available. */
  icon: string | undefined;
  /** Display label (raw id / description — consumer may format it). */
  label: string;
  /** Per-1k-steps value. Negative = cost. */
  value: number;
};

/** All inputs required to compute a net recipe value per 1k steps. */
export type RecipeValueParams = {
  materials: RecipeMaterial[];
  itemRewards: Record<string, number>;
  /** Steps per reward roll (derived from skill modifiers). */
  stepsPerRewardRoll: number;
  /** Steps per crafting action (derived from skill modifiers). */
  stepsPerAction: number;
  /** Fraction of actions where materials are not consumed (0–1). */
  noMaterialsConsumed: number;
  /** Whether fine materials are in use. */
  useFine: boolean;
  /** Lookup of gear items; used to distinguish gear vs material rewards. */
  allGearItems: Record<string, GearItemRef>;
  /** Full item value map from the data store. */
  itemValues: ItemValueMap;
  /**
   * Pre-computed crafting quality outcome odds for the selected recipe.
   * Obtain via `getOutcomeOdds(level, qualityOutcome, useFine)`.
   */
  craftingOdds: QualityOutcomeResult[];
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Returns the per-1k-steps value contribution of a single item from a
 * value-source map.
 *
 * Returns `undefined` when the item id is not present in `valueSource` and
 * there is no fine-steps component.
 *
 * @param id          Item identifier.
 * @param itemInfo    Step counts (normal and fine) for the item.
 * @param valueSource Map of item id → `{ common, fine? }` values.
 */
export function materialValue(
  id: string,
  itemInfo: MaterialValueInfo,
  valueSource: MaterialValueSource,
): number | undefined {
  const { stepsPerNormal, stepsPerFine } = itemInfo;
  const normalPerStep = stepsPerNormal ? 1000 / stepsPerNormal : 0;

  if (stepsPerFine) {
    const finePerStep = 1000 / stepsPerFine;
    const entry = valueSource[id];
    return normalPerStep * entry.common + finePerStep * (entry.fine ?? 0);
  } else if (id in valueSource) {
    return normalPerStep * valueSource[id].common;
  }

  return undefined;
}

/**
 * Computes the total gold (money) value earned per 1k steps from the full
 * drop-item map.
 *
 * @param dropItemInfoMap Resolved drop info keyed by item id.
 * @param allGearItems    Gear-item registry (type + quality per item).
 * @param itemValues      Full item value map from the data store.
 */
export function computeGoldTotal(
  dropItemInfoMap: Record<string, DropItemInfo>,
  allGearItems: Record<string, GearItemRef>,
  itemValues: ItemValueMap,
): number {
  return Object.entries(dropItemInfoMap).reduce((total, [id, info]) => {
    if (id === "gold") {
      return total + info.itemsPerStep;
    }

    if (id in allGearItems && id in itemValues) {
      const { quality } = allGearItems[id];
      const price = (itemValues[id] as Record<string, number>)[quality];
      return total + info.itemsPerStep * price;
    }

    if (id in itemValues) {
      const val = materialValue(
        id,
        info,
        itemValues as unknown as MaterialValueSource,
      );
      return total + (val ?? 0);
    }

    return total;
  }, 0);
}

/**
 * Computes the total adventurer's guild token value earned per 1k steps.
 *
 * @param dropItemInfoMap Resolved drop info keyed by item id.
 * @param tokenValues     Token-value map (from domain constants).
 */
export function computeTokenTotal(
  dropItemInfoMap: Record<string, DropItemInfo>,
  tokenValues: TokenValuesMap,
): number {
  return Object.entries(dropItemInfoMap)
    .filter(([id]) => id in tokenValues)
    .map(([id, info]) => materialValue(id, info, tokenValues) ?? 0)
    .reduce((a, b) => a + b, 0);
}

/**
 * Computes the net recipe value (total reward value minus total material cost)
 * per 1k steps.
 *
 * The caller is responsible for pre-computing `craftingOdds` via
 * `getOutcomeOdds(levelReq, qualityOutcome, useFine)`.
 *
 * @param params All inputs required for the calculation.
 */
export function computeRecipeValue(params: RecipeValueParams): number {
  const {
    materials,
    itemRewards,
    stepsPerRewardRoll,
    stepsPerAction,
    noMaterialsConsumed,
    useFine,
    allGearItems,
    itemValues,
    craftingOdds,
  } = params;

  const rewardValues = Object.entries(itemRewards).map(([item, amount]) => {
    if (item in allGearItems && allGearItems[item].type === "crafted") {
      // Crafted gear: weight each quality tier by its value
      const weightedValue = craftingOdds.reduce(
        (total, { qualityValue, value }) =>
          total +
          value * (itemValues[item] as Record<string, number>)[qualityValue],
        0,
      );
      return weightedValue * (1000 / stepsPerRewardRoll);
    } else {
      // Material reward: compute per-step value using reward-roll cadence
      const info: MaterialValueInfo = {
        stepsPerNormal: useFine ? 0 : stepsPerRewardRoll,
        stepsPerFine: useFine ? stepsPerRewardRoll : 0,
      };
      return (
        amount *
        (materialValue(
          item,
          info,
          itemValues as unknown as MaterialValueSource,
        ) ?? 0)
      );
    }
  });

  const rewardValue1k = rewardValues.reduce((a, b) => a + b, 0);

  const allMaterialOptions = materials.flatMap(({ options }) => options[0]);
  const materialCosts = allMaterialOptions.map(({ amount, item }) => {
    if (item in allGearItems) {
      // Gear material: use first available quality value
      return amount * Object.values(itemValues[item])[0];
    } else {
      const quality = useFine ? "fine" : "common";
      return amount * (itemValues[item] as Record<string, number>)[quality];
    }
  });

  const materialsPer1k = 1000 / (stepsPerAction / (1 - noMaterialsConsumed));
  const materialCost1k =
    materialCosts.reduce((a, b) => a + b, 0) * materialsPer1k;

  return rewardValue1k - materialCost1k;
}

// ---------------------------------------------------------------------------
// Breakdown builders  (for the expandable detail view)
// ---------------------------------------------------------------------------

/**
 * Builds a categorised breakdown of gold/money value per 1k steps.
 *
 * Drop items are grouped into three categories:
 * - **Gold** — the raw gold drop (`id === "gold"`).
 * - **Drops** — all other drop items that are not containers.
 * - **Chests** — drop items whose gear type is `"container"`.
 *
 * Each category produces a single `BreakdownLine` using the first item's
 * icon and the summed value across all items in that category.
 *
 * When `recipeParams` is supplied, individual item-reward lines and a
 * combined material-cost line are appended (recipe lines are NOT grouped).
 *
 * @param dropItemInfoMap Resolved drop info keyed by item id.
 * @param allGearItems    Gear-item registry (type, quality, optional icon).
 * @param allMaterialItems     Material-item registry
 * @param itemValues      Full item value map from the data store.
 * @param recipeParams    Optional recipe params — when present, recipe
 *                        reward and material-cost lines are included.
 */
export function buildGoldBreakdown(
  dropItemInfoMap: Record<string, DropItemInfo>,
  allGearItems: Record<string, GearItemRef>,
  allMaterialItems: Record<string, MaterialInfo>,
  itemValues: ItemValueMap,
  recipeParams?: RecipeValueParams,
): BreakdownLine[] {
  const lines: BreakdownLine[] = [];

  // Accumulators for the three drop categories.
  let goldValue = 0;
  let goldIcon: string | undefined;

  let dropsValue = 0;
  let dropsIcon: string | undefined;

  let chestsValue = 0;
  let chestsIcon: string | undefined;

  for (const [id, info] of Object.entries(dropItemInfoMap)) {
    let value: number;

    if (id === "gold") {
      value = info.itemsPerStep;
      goldValue += value;
      goldIcon ??= info.icon;
      continue;
    }

    if (id in allGearItems && id in itemValues) {
      const { quality } = allGearItems[id];
      value =
        info.itemsPerStep * (itemValues[id] as Record<string, number>)[quality];
    } else if (id in itemValues) {
      value =
        materialValue(id, info, itemValues as unknown as MaterialValueSource) ??
        0;
    } else {
      continue;
    }

    if (value === 0) continue;

    if (id in allGearItems || id in allMaterialItems) {
      dropsValue += value;
      dropsIcon ??= info.icon;
    } else {
      chestsValue += value;
      chestsIcon ??= info.icon;
    }
  }

  if (goldValue !== 0) {
    lines.push({ icon: goldIcon, label: "Gold", value: goldValue });
  }
  if (dropsValue !== 0) {
    lines.push({ icon: dropsIcon, label: "Drops", value: dropsValue });
  }
  if (chestsValue !== 0) {
    lines.push({ icon: chestsIcon, label: "Chests", value: chestsValue });
  }

  if (recipeParams) {
    const {
      itemRewards,
      materials,
      stepsPerRewardRoll,
      stepsPerAction,
      noMaterialsConsumed,
      useFine,
      allGearItems: recipeGearItems,
      itemValues: recipeItemValues,
      craftingOdds,
    } = recipeParams;

    const resolveIcon = (id: string): string | undefined =>
      recipeGearItems[id]?.icon ?? allMaterialItems?.[id]?.icon;

    // One line per reward item.
    for (const [item, amount] of Object.entries(itemRewards)) {
      let value: number;

      if (item in recipeGearItems && recipeGearItems[item].type === "crafted") {
        const weightedValue = craftingOdds.reduce(
          (total, { qualityValue, value: v }) =>
            total +
            v *
              (recipeItemValues[item] as Record<string, number>)[qualityValue],
          0,
        );
        value = weightedValue * (1000 / stepsPerRewardRoll);
      } else {
        const info: MaterialValueInfo = {
          stepsPerNormal: useFine ? 0 : stepsPerRewardRoll,
          stepsPerFine: useFine ? stepsPerRewardRoll : 0,
        };
        value =
          amount *
          (materialValue(
            item,
            info,
            recipeItemValues as unknown as MaterialValueSource,
          ) ?? 0);
      }

      if (value === 0) continue;

      lines.push({
        icon: resolveIcon(item),
        label: item,
        value,
      });
    }

    // Single combined material-cost line, icon from the first material.
    const allMaterialOptions = materials.flatMap(({ options }) => options[0]);
    const firstMatId = allMaterialOptions[0]?.item;
    const materialsCostIcon = firstMatId
      ? (recipeGearItems[firstMatId]?.icon ??
        allMaterialItems?.[firstMatId]?.icon)
      : undefined;

    const totalCost = allMaterialOptions.reduce((sum, { amount, item }) => {
      if (item in recipeGearItems) {
        return sum + amount * Object.values(recipeItemValues[item])[0];
      }
      const quality = useFine ? "fine" : "common";
      return (
        sum +
        amount * (recipeItemValues[item] as Record<string, number>)[quality]
      );
    }, 0);

    const materialsPer1k = 1000 / (stepsPerAction / (1 - noMaterialsConsumed));
    const costPer1k = totalCost * materialsPer1k;

    if (costPer1k !== 0) {
      lines.push({
        icon: materialsCostIcon,
        label: "Materials",
        value: -costPer1k,
      });
    }
  }

  return lines;
}

/**
 * Builds a per-token-item breakdown of adventurer's guild token value per 1k steps.
 *
 * @param dropItemInfoMap Resolved drop info keyed by item id.
 * @param tokenValuesMap  Token-value map (from domain constants).
 */
export function buildTokenBreakdown(
  dropItemInfoMap: Record<string, DropItemInfo>,
  tokenValuesMap: TokenValuesMap,
): BreakdownLine[] {
  const lines: BreakdownLine[] = [];

  for (const [id, info] of Object.entries(dropItemInfoMap)) {
    if (!(id in tokenValuesMap)) continue;

    const value = materialValue(id, info, tokenValuesMap) ?? 0;
    if (value === 0) continue;

    lines.push({
      icon: info.icon,
      label: id,
      value,
    });
  }

  return lines;
}
