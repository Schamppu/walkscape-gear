import { getGearSetStats } from "./stats";
import { priorityValue } from "./priority";
import type { GearSet, MappedItem, OptimiserItem } from "./types";

const lowStats = [
  "stepsPerRewardRoll",
  "stepsPerFineRoll",
  "stepsPerCollectibleRoll",
];
const highStats = ["xpPerStep", "craftsPerMaterial"];

export const isHighStat = (): boolean => highStats.includes(priorityValue());

export const startScore = (): number => {
  const prio = priorityValue();
  if (lowStats.includes(prio)) return Infinity;
  if (highStats.includes(prio)) return -Infinity;
  return Infinity;
};

export const compareScore = (value: number, best: number): number => {
  const prio = priorityValue();
  if (lowStats.includes(prio)) return best - value;
  if (highStats.includes(prio)) return value - best;
  return best - value;
};

export const getItemScores = (
  slot: string,
  items: MappedItem[],
  baseScore: number,
): OptimiserItem[] => {
  return items.map((item) => ({
    ...item,
    score: compareScore(
      getGearSetStats({ [slot]: item as OptimiserItem }),
      baseScore,
    ),
  }));
};
