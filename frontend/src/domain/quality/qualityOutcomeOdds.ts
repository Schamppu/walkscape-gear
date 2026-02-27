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
 * @param useFineMaterials Whether fine materials are used (shifts all tiers up by one).
 * @returns An array of quality outcome results ordered from lowest to highest tier.
 */
export function getOutcomeOdds(
  levelReq: number,
  qualityOutcome: number,
  useFineMaterials: boolean,
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

  if (!useFineMaterials) {
    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  } else {
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
  return base.map(({ qualityValue, name, weight }) => ({
    qualityValue,
    name,
    value: weight / totalWeight,
    crafts: totalWeight / weight,
    odds: (weight / totalWeight) * 100,
    materialsNeeded: (totalWeight / weight) / craftsPerMaterial,
  }));
}
