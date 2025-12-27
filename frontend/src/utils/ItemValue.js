const normalItemValueTable = {
  none: 0,
  extremelyLow: 1,
  veryLow: 2,
  low: 4,
  lowMedium: 7,
  medium: 10,
  mediumHigh: 15,
  lowHigh: 25,
  high: 40,
  veryHigh: 60,
  expensive: 100,
  veryExpensive: 150,
  luxurious: 250,
  veryLuxurious: 500,
  priceless: 1000,
};

const fineItemValueTable = {
  none: 6,
  extremelyLow: 11,
  veryLow: 15,
  low: 24,
  lowMedium: 38,
  medium: 51,
  mediumHigh: 74,
  lowHigh: 119,
  high: 186,
  veryHigh: 276,
  expensive: 456,
  veryExpensive: 681,
  luxurious: 1131,
  veryLuxurious: 2256,
  priceless: 4506,
};

const rarityAdders = {
  normal: { valueAdder: 0, modifierAdder: 0 },
  good: { valueAdder: 1.5, modifierAdder: 1 },
  great: { valueAdder: 3.5, modifierAdder: 2 },
  excellent: { valueAdder: 5, modifierAdder: 3 },
  perfect: { valueAdder: 8, modifierAdder: 4.5 },
  eternal: { valueAdder: 25.5, modifierAdder: 7 },
};

export const price = (value, modifier, quality = "normal", fine = false) => {
  const base = fine ? fineItemValueTable[value] : normalItemValueTable[value];
  const { valueAdder, modifierAdder } = rarityAdders[quality];
  return Math.floor((base + valueAdder) * modifier * modifierAdder);
};
