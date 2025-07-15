/// Calculates the experience needed to level up character level
const xpToLevelSkill = (level) => {
  let xp = 0;
  for (let i = 1; i <= level; i++) {
    xp += xpEquate(i);
  }
  return Math.floor(xp / 4);
};

const xpEquate = (level) => {
  return Math.floor(level + 300 * Math.pow(2, level / 7));
};

// Pre-calculate XP lookup table for levels 1-99
const XP_TABLE = (() => {
  const table = [];
  for (let level = 1; level <= 99; level++) {
    table[level] = xpToLevelSkill(level - 1);
  }
  return table;
})();

/// Calculates the character level from current XP using lookup table
const levelFromXp = (currentXp) => {
  if (currentXp <= 0) return 1;

  // Find the highest level where required XP <= currentXp
  for (let level = 99; level >= 1; level--) {
    if (currentXp >= XP_TABLE[level]) {
      return level;
    }
  }

  return 1; // Fallback
};

/// Calculates XP progress within current level (0-1)
const xpProgressInLevel = (currentXp) => {
  const level = levelFromXp(currentXp);
  const xpForCurrentLevel = XP_TABLE[level];
  const xpForNextLevel = level < 99 ? XP_TABLE[level + 1] : XP_TABLE[99];

  if (level >= 99) return 1; // Max level
  if (xpForNextLevel <= xpForCurrentLevel) return 0;

  const progressXp = currentXp - xpForCurrentLevel;
  const levelXpRange = xpForNextLevel - xpForCurrentLevel;

  return Math.min(1, Math.max(0, progressXp / levelXpRange));
};

/// Calculates how much XP is needed to reach the next level
const xpToNextLevel = (currentXp) => {
  const level = levelFromXp(currentXp);

  if (level >= 99) return 0; // Already at max level

  const xpForNextLevel = XP_TABLE[level + 1];
  return Math.max(0, xpForNextLevel - currentXp);
};

export {
  xpToLevelSkill,
  levelFromXp,
  xpProgressInLevel,
  xpToNextLevel,
  XP_TABLE,
};
