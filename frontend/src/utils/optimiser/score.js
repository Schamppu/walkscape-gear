import { getGearSetStats } from "./stats";
import { priorityValue } from "./priority";

const lowStats = [
  "stepsPerRewardRoll",
  "stepsPerFineRoll",
  "stepsPerCollectibleRoll",
];
const highStats = ["xpPerStep", "craftsPerMaterial"];

export const isHighStat = () => highStats.includes(priorityValue());

export const startScore = () => {
  const prio = priorityValue();
  if (lowStats.includes(prio)) return Infinity;
  if (highStats.includes(prio)) return -Infinity;
};

export const compareScore = (value, best) => {
  const prio = priorityValue();
  if (lowStats.includes(prio)) return best - value;
  if (highStats.includes(prio)) return value - best;
};

export const getItemScores = (slot, items, baseScore) => {
  return items.map((item) => ({
    ...item,
    score: compareScore(getGearSetStats({ [slot]: item }), baseScore),
  }));
};
