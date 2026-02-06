const toolbeltSizes = {
  1: 3,
  20: 4,
  50: 5,
  80: 6,
};

export const getToolbeltSize = (level) => {
  const threshold = Object.keys(toolbeltSizes).find((value) => value <= level);
  return threshold;
};

const stepsToLevel = (level) => {
  let steps = 0;
  for (let i = 1; i <= level; i++) {
    steps += xpEquate(i);
  }
  return Math.floor(steps / 4) * 4.6;
};

const xpEquate = (level) => {
  return Math.floor(level + 300 * Math.pow(2, level / 7));
};

// Pre-calculate XP lookup table for levels 1-99
const STEPS_TABLE = (() => {
  const table = [];
  for (let level = 1; level <= 99; level++) {
    table[level] = stepsToLevel(level - 1);
  }
  return table;
})();

export const levelFromSteps = (steps) => {
  if (steps <= 0) return 1;

  // Find the highest level where required XP <= currentXp
  for (let level = 99; level >= 1; level--) {
    if (steps >= STEPS_TABLE[level]) {
      return level;
    }
  }

  return 1; // Fallback
};
