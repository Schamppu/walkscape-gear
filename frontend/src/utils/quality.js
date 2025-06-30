export const craftingQualityOptions = [
  {
    name: "Normal",
    value: "common",
  },
  {
    name: "Good",
    value: "uncommon",
  },
  {
    name: "Great",
    value: "rare",
  },
  {
    name: "Excellent",
    value: "epic",
  },
  {
    name: "Perfect",
    value: "legendary",
  },
  {
    name: "Eternal",
    value: "ethereal",
  },
];

export const qualityOptions = [
  {
    name: "Common",
    value: "common",
  },
  {
    name: "Uncommon",
    value: "uncommon",
  },
  {
    name: "Rare",
    value: "rare",
  },
  {
    name: "Epic",
    value: "epic",
  },
  {
    name: "Legendary",
    value: "legendary",
  },
  {
    name: "Ethereal",
    value: "ethereal",
  },
];

export const consumableQualityOptions = [
  {
    name: "Common",
    value: "consumableCommon",
  },
  {
    name: "Fine",
    value: "consumableFine",
  },
];

const qualityRank = Object.fromEntries(
  qualityOptions.map(({ value }, index) => [value, index])
);

export function itemQualityNameSort(a, b, reverseQuality = false) {
  const aRank = qualityRank[a.quality] ?? Infinity;
  const bRank = qualityRank[b.quality] ?? Infinity;

  if (aRank !== bRank) {
    return reverseQuality ? bRank - aRank : aRank - bRank;
  }

  return a.name.localeCompare(b.name);
}
