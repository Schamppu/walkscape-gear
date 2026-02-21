import { skillLevelFromXp, characterLevelFromSteps } from "@/domain/character";
import { qualityOptions } from "@/domain/constants/quality.ts";
import { isEqual } from "./isEqual";

function processSteps(stepsData, playerStore) {
  if (!stepsData || typeof stepsData !== "number") {
    return null;
  }

  const currentLevel = playerStore.level;
  const newLevel = characterLevelFromSteps(stepsData);
  if (currentLevel === newLevel) return { hasUpdates: false };
  playerStore.level = newLevel;
  return { hasUpdates: true, data: newLevel };
}

/**
 * Processes skills data from import
 * @param {Object} skillsData - Skills object from parsed data
 * @param {Object} playerStore - Player store for validation
 * @returns {Object|null} - Updated skill levels or null if no valid data
 */
function processSkills(skillsData, playerStore) {
  if (!skillsData || typeof skillsData !== "object") {
    return null;
  }

  // Start with current skill levels as base
  const updatedSkillLevels = { ...playerStore.skillLevels };

  let updated = false;
  // Only update skills that exist in player store
  for (const [skillId, xp] of Object.entries(skillsData)) {
    // Validate: skill must exist in our store and xp must be a valid number
    if (skillId in updatedSkillLevels && typeof xp === "number" && xp >= 0) {
      const level = skillLevelFromXp(xp);
      updatedSkillLevels[skillId] = level;
      if (level !== playerStore.skillLevels[skillId]) updated = true;
    } else {
      console.warn(`Skipped invalid skill data: ${skillId} = ${xp}`);
    }
  }

  if (updated) return { hasUpdates: true, data: updatedSkillLevels };
  return { hasUpdates: false };
}

/**
 * Processes achievement points from import
 * @param {number} achievementPoints - Achievement points from parsed data
 * @returns {number|null} - Achievement points or null if invalid
 */
function processAchievementPoints(achievementPoints, playerStore) {
  if (achievementPoints && typeof achievementPoints === "number") {
    if (playerStore.achievementPoints !== achievementPoints)
      return { hasUpdates: true, data: achievementPoints };
    return { hasUpdates: false };
  } else {
    console.warn("Invalid or missing achievement points data.");
    return null;
  }
}

/**
 * Processes faction reputation data from import
 * @param {Object} reputationData - Reputation object from parsed data
 * @param {Object} playerStore - Player store for validation
 * @returns {Object|null} - Updated reputation or null if no valid data
 */
function processReputation(reputationData, playerStore) {
  if (!reputationData || typeof reputationData !== "object") {
    return null;
  }

  const updatedReputations = { ...playerStore.factionReputation };

  let updated = false;
  // Only update reputations that exist in the player store
  for (const [faction, reputation] of Object.entries(reputationData)) {
    if (
      faction in playerStore.factionsMap &&
      typeof reputation === "number" &&
      reputation >= 0
    ) {
      const factionReputation = playerStore.factionsMap[faction].reputation;
      const repValue = Math.floor(reputation);
      updatedReputations[factionReputation] = repValue;
      if (repValue !== playerStore.factionReputation[factionReputation])
        updated = true;
    } else {
      console.warn(`Skipped invalid faction data: ${faction} = ${reputation}`);
    }
  }

  if (updated) return { hasUpdates: true, data: updatedReputations };
  return { hasUpdates: false };
}

/**
 * Processes collectibles array from import
 * @param {Array} collectiblesData - Collectibles array from parsed data
 * @param {Object} allItems - Items object to update
 */
function processCollectibles(collectiblesData, allItems) {
  if (!Array.isArray(collectiblesData)) return;

  for (const itemId of collectiblesData) {
    if (typeof itemId === "string") {
      allItems[itemId] = (allItems[itemId] || 0) + 1;
    }
  }
}

/**
 * Processes item count objects (inventory, bank, consumables) from import
 * @param {Object} itemData - Item object from parsed data
 * @param {Object} allItems - Items object to update
 */
function processItemCounts(itemData, allItems) {
  if (!itemData || typeof itemData !== "object") return;

  for (const [itemId, count] of Object.entries(itemData)) {
    if (typeof itemId === "string" && typeof count === "number" && count > 0) {
      allItems[itemId] = (allItems[itemId] || 0) + count;
    }
  }
}

/**
 * Processes gear object from import
 * @param {Object} gearData - Gear object from parsed data
 * @param {Object} allItems - Items object to update
 */
function processGear(gearData, allItems) {
  if (!gearData || typeof gearData !== "object") return;

  for (const [slot, itemId] of Object.entries(gearData)) {
    if (typeof itemId === "string" && slot) {
      // slot can be string or object
      allItems[itemId] = (allItems[itemId] || 0) + 1;
    }
  }
}

/**
 * Parses item ID to extract base ID and quality suffix
 * @param {string} itemId - Item ID potentially with quality suffix
 * @returns {Object} - { baseId, quality }
 */
function parseItemId(itemId) {
  if (!itemId || typeof itemId !== "string") {
    return { baseId: "", quality: "common" };
  }

  // Check for _fine suffix (consumables)
  if (itemId.endsWith("_fine")) {
    return {
      baseId: itemId.slice(0, -5), // Remove '_fine'
      quality: "consumableFine",
    };
  }

  // Check for quality suffix from qualityOptions
  const qualityValues = qualityOptions.map(({ value }) => value);
  for (const quality of qualityValues) {
    const suffix = `_${quality}`;
    if (itemId.endsWith(suffix)) {
      return {
        baseId: itemId.slice(0, -suffix.length), // Remove '_quality'
        quality: quality,
      };
    }
  }

  // No quality suffix found
  return {
    baseId: itemId,
    quality: "common", // Default quality
  };
}

/**
 * Gets quality rank for sorting (higher index = higher quality)
 * @param {string} quality - Quality string
 * @returns {number} - Quality rank
 */
function getQualityRank(quality) {
  const index = qualityOptions.findIndex(({ value }) => value === quality);
  return index >= 0 ? index : 0; // Default to common (0) if not found
}

/**
 * Determines the highest and second highest qualities for an item
 * @param {Array} qualities - Array of quality strings
 * @param {boolean} isRing - Whether the item is a ring (needs quality2)
 * @returns {Object} - { quality, quality2 }
 */
function determineQualities(qualities, isRing) {
  if (qualities.length === 0) {
    return { quality: "common", quality2: null };
  }

  // Sort qualities by rank (highest first)
  const sortedQualities = qualities
    .map((quality) => ({ quality, rank: getQualityRank(quality) }))
    .sort((a, b) => b.rank - a.rank);

  const highest = sortedQualities[0].quality;

  if (!isRing) {
    return { quality: highest, quality2: null };
  }

  const secondHighest = sortedQualities[1];

  return {
    quality: highest,
    quality2: secondHighest ? secondHighest.quality : null,
  };
}

/**
 * Processes all item sources from import data
 * @param {Object} parsedData - Parsed import data
 * @param {Object} itemsStore - Items store for validation and updates
 * @returns {Object} - Updated owned items for the store
 */
function processItems(parsedData, reset, itemsStore) {
  if (!parsedData || !itemsStore) {
    console.warn("Missing data or items store for item processing");
    return null;
  }

  const allItems = {};

  // Process different item sources
  processCollectibles(parsedData.collectibles, allItems);
  processItemCounts(parsedData.inventory, allItems);
  processItemCounts(parsedData.bank, allItems);
  processItemCounts(parsedData.consumables, allItems);
  processGear(parsedData.gear, allItems);

  // Group items by base ID and collect qualities
  const itemGroups = {};

  for (const [itemId, count] of Object.entries(allItems)) {
    if (typeof count !== "number" || count <= 0) {
      // console.warn(`Skipping item with invalid count: ${itemId} = ${count}`);
      continue;
    }

    const { baseId, quality } = parseItemId(itemId);

    if (!baseId) {
      console.warn(`Skipping item with invalid ID: ${itemId}`);
      continue;
    }

    // Only process items that exist in the items store
    if (!(baseId in itemsStore.allGearItems)) {
      // console.warn(`Skipping unknown item: ${baseId} (from ${itemId})`);
      continue;
    }

    if (!itemGroups[baseId]) {
      itemGroups[baseId] = {
        qualities: [],
        totalCount: 0,
      };
    }

    // Add quality for each count of the item
    for (let i = 0; i < count; i++) {
      itemGroups[baseId].qualities.push(quality);
    }
    itemGroups[baseId].totalCount += count;
  }

  // Build updated owned items
  const updatedOwnedItems = { ...itemsStore.ownedItems };
  const processedItems = Object.fromEntries(
    Object.keys(updatedOwnedItems).map((id) => [id, false]),
  );
  if (reset)
    Object.entries(updatedOwnedItems).forEach(([id, item]) => {
      const isPet = id in itemsStore.petsMap;
      const quality = isPet ? "0" : "common";
      const quality2 = isPet ? "common" : null;
      updatedOwnedItems[id] = {
        ...item,
        owned: false,
        quality,
        quality2,
      };
    });

  let hasUpdates = false;
  for (const [baseId, { qualities }] of Object.entries(itemGroups)) {
    const itemData = itemsStore.allGearItems[baseId];
    const existingOwned = itemsStore.ownedItems[baseId];

    if (!itemData) {
      console.warn(`Item data not found for: ${baseId}`);
      continue;
    }

    // Preserve existing hidden value or default to false
    const hidden = existingOwned?.hidden ?? false;

    if (itemData.type === "consumable") {
      const quality = qualities.includes("common") ? "consumableCommon" : null;
      const quality2 = qualities.includes("consumableFine")
        ? "consumableFine"
        : null;
      const owned = quality || quality2 ? true : false;
      const data = {
        owned,
        hidden,
        quality,
        quality2,
      };
      updatedOwnedItems[baseId] = data;
      if (!isEqual(itemsStore.ownedItems[baseId], data)) hasUpdates = true;
    } else if (itemData.type === "crafted") {
      // For crafted items, determine qualities based on what was found
      const isRing = itemData.gearType === "ring";
      const { quality, quality2 } = determineQualities(qualities, isRing);

      const data = {
        owned: true,
        hidden,
        quality,
        quality2,
      };
      updatedOwnedItems[baseId] = data;
      if (!isEqual(itemsStore.ownedItems[baseId], data)) hasUpdates = true;
    } else {
      // For non-crafted items, use default quality
      const data = {
        owned: true,
        hidden,
        quality: itemData.quality || "common",
        quality2: null,
      };

      updatedOwnedItems[baseId] = data;
      if (!isEqual(itemsStore.ownedItems[baseId], data)) hasUpdates = true;
    }
    processedItems[baseId] = true;
  }

  const unprocessedItems = Object.entries(processedItems).filter(
    ([, val]) => !val,
  );

  return {
    hasUpdates: hasUpdates || (reset && Boolean(unprocessedItems.length)),
    data: updatedOwnedItems,
  };
}

/**
 * Processes imported character data and returns validated updates
 * @param {string} data - JSON string containing character data
 * @param {Object} playerStore - Player store instance for validation
 * @param {Object} itemsStore - Items store for validation and item processing
 * @returns {Object} - Processed data with skills, achievementPoints, reputation, and items
 */
export function processCharacterImport(data, reset, playerStore, itemsStore) {
  if (!data) {
    throw new Error("No data provided");
  }

  const parsedData = JSON.parse(data);

  return {
    level: processSteps(parsedData.steps, playerStore),
    skills: processSkills(parsedData.skills, playerStore),
    achievementPoints: processAchievementPoints(
      parsedData.achievement_points,
      playerStore,
    ),
    reputation: processReputation(parsedData.reputation, playerStore),
    items: processItems(parsedData, reset, itemsStore),
  };
}
