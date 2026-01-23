import { getGearSetStats } from "./stats";
import { selectedPriority } from "./priority";

const lowStats = [
  "stepsPerRewardRoll",
  "stepsPerFineRoll",
  "stepsPerCollectibleRoll",
];
const highStats = ["xpPerStep", "craftsPerMaterial"];

export const startScore = () => {
  const prio = selectedPriority();
  if (lowStats.includes(prio)) return Infinity;
  if (highStats.includes(prio)) return -Infinity;
};

export const compareScore = (value, best) => {
  const prio = selectedPriority();
  if (lowStats.includes(prio)) return best - value;
  if (highStats.includes(prio)) return value - best;
};

export const getItemScores = (slot, items, baseScore) => {
  return items.map((item) => ({
    ...item,
    score: compareScore(getGearSetStats({ [slot]: item }), baseScore),
  }));
};
