/**
 * Purpose:
 * Pure calculation of quality outcome odds for crafting.
 *
 * Responsibilities:
 * - Calculate the probability of each quality tier given crafting parameters.
 * - Return expected crafts needed per tier.
 *
 * Does NOT:
 * - Mutate global state
 * - Import any Vue / reactive APIs
 */

import { craftingQualityOptions } from "@/domain/constants/quality";

export type FineMaterialsMode = "none" | "partial" | "all";

export type QualityOutcomeResult = {
  qualityValue: string;
  name: string;
  value: number;
  crafts: number;
  odds: number;
  materialsNeeded: number;
};

/**
 * Calculates the odds of achieving different quality outcomes based on the
 * provided parameters.
 *
 * @param levelReq      The level requirement for the recipe.
 * @param qualityOutcome A numerical value representing the crafting quality outcome stat.
 * @param fineMode      Fine materials mode:
 *   - "none":    No fine materials; each tier is floored at the tier above.
 *   - "partial": Some materials are fine; 30% of each tier bleeds into the next.
 *   - "all":     All materials are fine; all tiers shift up by one, lowest becomes 0.
 * @returns An array of quality outcome results ordered from lowest to highest tier.
 */
export function getOutcomeOdds(
  levelReq: number,
  qualityOutcome: number,
  fineMode: FineMaterialsMode,
  craftsPerMaterial = 1
): QualityOutcomeResult[] {
  const weights: [number, number][] = [
    [1000, 4],
    [200, 4],
    [50, 4],
    [10, 4],
    [2.5, 2],
    [0.05, 0.05],
  ];

  type BaseEntry = {
    name: string;
    qualityValue: string;
    bandStart: number;
    bandEnd: number;
    weightStart: number;
    weightEnd: number;
    slope: number;
    weight: number;
  };

  let base: BaseEntry[] = craftingQualityOptions
    .map((quality, index) => ({
      name: quality.name,
      qualityValue: quality.value,
      bandStart: index * 100,
      bandEnd: (index + 1) * (100 + levelReq),
      weightStart: weights[index][0],
      weightEnd: weights[index][1],
    }))
    .map((item) => {
      const { bandStart, bandEnd, weightStart, weightEnd } = item;
      return {
        ...item,
        slope: (weightStart - weightEnd) / (bandStart - bandEnd),
      };
    })
    .map((item) => {
      const { weightEnd, weightStart, slope, bandStart } = item;
      return {
        ...item,
        weight:
          qualityOutcome < bandStart
            ? weightStart
            : Math.max(
                weightEnd,
                weightStart + slope * (qualityOutcome - bandStart)
              ),
      };
    });

  if (fineMode === "none" || fineMode === "partial") {
    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  } else {
    // "all": shift every tier up by one; lowest becomes 0, highest absorbs second-highest.
    for (let i = 0; i < base.length - 1; i++) {
      base[i].name = base[i + 1].name;
      base[i].qualityValue = base[i + 1].qualityValue;
    }
    base[4].weight = base[4].weight + base[5].weight;
    base = base.slice(0, -1);

    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  }

  const totalWeight = base.reduce((acc, item) => acc + item.weight, 0);
  const normalized = base.map((b) => b.weight / totalWeight);

  // For "partial": 30% of each tier's odds bleed into the tier above it.
  const adjusted =
    fineMode === "partial"
      ? normalized.map((v, i) => {
          const bleedIn = i > 0 ? 0.3 * normalized[i - 1] : 0;
          const bleedOut = i < normalized.length - 1 ? 0.3 * v : 0;
          return v - bleedOut + bleedIn;
        })
      : normalized;

  return base.map(({ qualityValue, name }, i) => ({
    qualityValue,
    name,
    value: adjusted[i],
    crafts: 1 / adjusted[i],
    odds: adjusted[i] * 100,
    materialsNeeded: 1 / adjusted[i] / craftsPerMaterial,
  }));
}
