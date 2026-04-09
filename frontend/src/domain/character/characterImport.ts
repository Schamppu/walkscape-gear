/**
 * Purpose:
 * This module provides functions that extract data from a game character import.
 * the main function, 'processCharacterImport', takes a character import object
 * and processes it to extract relevant information such as
 * skill levels, character level, faction reputations, and owned items.
 * The extracted data is then returned in a structured format for use in the application.
 *
 * Responsibilities:
 * 1. Extract skill levels from the character import data.
 * 2. Extract character level from the character import data.
 * 3. Extract faction reputations from the character import data.
 * 4. Extract owned items from the character import data.
 * 5. Return the extracted data in a structured format for use in the application.
 *
 * Does NOT:
 * 1. Handle any UI-related logic or presentation of the data.
 * 2. Handle any data storage or persistence logic.
 * 3. Validate input or compare with current application state.
 */

import { skillLevelFromXp, characterLevelFromSteps } from "@/domain/character";
import { qualityOptions } from "@/domain/constants/quality";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Raw shape of a character save file as received from the game client. */
export type CharacterImportRaw = {
  steps?: unknown;
  achievement_points?: unknown;
  skills?: unknown;
  gear?: unknown;
  consumables?: unknown;
  inventory?: unknown;
  bank?: unknown;
  collectibles?: unknown;
  reputation?: unknown;
  pets?: unknown;
  available_pets?: unknown;
  available_eggs?: unknown;
};

/** Minimal item descriptor required for quality resolution. */
export type ItemCatalogEntry = {
  type: string;
  gearType?: string | null;
  quality?: string;
};

/** Shape of a single owned-item record in the store. */
export type OwnedItemEntry = {
  owned: boolean;
  hidden: boolean;
  quantity: number;
  craftedTier: string | null;
  craftedTier2: string | null;
  consumableCommon: boolean;
  consumableFine: boolean;
  petLevel: number | null;
  petRarity: string | null;
};

/**
 * Faction entry from the store's factionsMap.
 * Maps a game-side faction id (e.g. "jarvonia") to its store reputation key.
 */
export type FactionMapEntry = {
  reputation: string | null;
};

/** The fully parsed output of a character import. */
export type ParsedCharacterImport = {
  characterLevel: number | null;
  skillLevels: Record<string, number>;
  achievementPoints: number | null;
  factionReputations: Record<string, number>;
  ownedItems: Record<string, OwnedItemEntry>;
};

// ---------------------------------------------------------------------------
// Character level
// ---------------------------------------------------------------------------

/**
 * Converts raw step count to a character level (1-99).
 * Returns null when the input is not a positive number.
 */
export function parseCharacterLevel(steps: unknown): number | null {
  if (typeof steps !== "number" || steps <= 0) return null;
  return characterLevelFromSteps(steps);
}

// ---------------------------------------------------------------------------
// Skill levels
// ---------------------------------------------------------------------------

/**
 * Converts a map of skillId → XP values to a map of skillId → level (1-99).
 * Only skills present in `knownSkillIds` are included in the output.
 * Unknown or malformed entries are silently skipped.
 */
export function parseSkillLevels(
  skillsData: unknown,
  knownSkillIds: ReadonlyArray<string>,
): Record<string, number> {
  if (
    !skillsData ||
    typeof skillsData !== "object" ||
    Array.isArray(skillsData)
  ) {
    return {};
  }

  const result: Record<string, number> = {};
  const knownSet = new Set(knownSkillIds);

  for (const [skillId, xp] of Object.entries(
    skillsData as Record<string, unknown>,
  )) {
    if (knownSet.has(skillId) && typeof xp === "number" && xp >= 0) {
      result[skillId] = skillLevelFromXp(xp);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Achievement points
// ---------------------------------------------------------------------------

/**
 * Extracts achievement points from an import payload.
 * Returns null when the value is absent or not a non-negative integer.
 */
export function parseAchievementPoints(
  achievementPoints: unknown,
): number | null {
  if (typeof achievementPoints !== "number" || achievementPoints < 0)
    return null;
  return Math.floor(achievementPoints);
}

// ---------------------------------------------------------------------------
// Faction reputations
// ---------------------------------------------------------------------------

/**
 * Converts a map of factionId → raw reputation values to the store's
 * reputation-key → floored integer format.
 *
 * Only factions present in `factionsMap` are included.
 * Malformed or negative values are skipped.
 */
export function parseFactionReputations(
  reputationData: unknown,
  factionsMap: Readonly<Record<string, FactionMapEntry>>,
): Record<string, number> {
  if (
    !reputationData ||
    typeof reputationData !== "object" ||
    Array.isArray(reputationData)
  ) {
    return {};
  }

  const result: Record<string, number> = {};

  for (const [factionId, value] of Object.entries(
    reputationData as Record<string, unknown>,
  )) {
    const faction = factionsMap[factionId];
    if (
      faction &&
      faction.reputation !== null &&
      typeof value === "number" &&
      value >= 0
    ) {
      result[faction.reputation] = Math.floor(value);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Item parsing helpers (internal)
// ---------------------------------------------------------------------------

type ParsedItemId = {
  baseId: string;
  quality: string;
};

/** Parses a raw item-id string into its base id and quality suffix. */
function parseItemId(itemId: string): ParsedItemId {
  if (itemId.endsWith("_fine")) {
    return { baseId: itemId.slice(0, -5), quality: "consumableFine" };
  }

  for (const { value: quality } of qualityOptions) {
    const suffix = `_${quality}`;
    if (itemId.endsWith(suffix)) {
      return { baseId: itemId.slice(0, -suffix.length), quality };
    }
  }

  return { baseId: itemId, quality: "common" };
}

/** Aggregates raw item-id strings into a count map, merging duplicate ids. */
function collectRawItems(
  collectibles: unknown,
  inventory: unknown,
  bank: unknown,
  consumables: unknown,
  gear: unknown,
): Record<string, number> {
  const counts: Record<string, number> = {};

  const addOne = (id: unknown): void => {
    if (typeof id === "string" && id) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  };

  const addMany = (items: unknown): void => {
    if (!items || typeof items !== "object" || Array.isArray(items)) return;
    for (const [id, count] of Object.entries(
      items as Record<string, unknown>,
    )) {
      if (
        typeof count === "number" &&
        count > 0 &&
        typeof id === "string" &&
        id
      ) {
        counts[id] = (counts[id] ?? 0) + count;
      }
    }
  };

  if (Array.isArray(collectibles)) {
    collectibles.forEach(addOne);
  }

  addMany(inventory);
  addMany(bank);
  addMany(consumables);

  if (gear && typeof gear === "object" && !Array.isArray(gear)) {
    for (const itemId of Object.values(gear as Record<string, unknown>)) {
      addOne(itemId);
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Pet parsing helpers (internal)
// ---------------------------------------------------------------------------

type PetGroup = {
  level: number;
  rarity: "common" | "rare";
};

/**
 * Extracts a base species id and rarity from a raw species string.
 * Species with an underscore prefix variant (e.g. "lovestruck_chicken") are
 * treated as rare; the last underscore-delimited segment is the base id.
 * Single-word species (e.g. "reindeer") are common.
 */
function parsePetSpecies(species: string): { baseId: string; rarity: "common" | "rare" } {
  const lastUnderscore = species.lastIndexOf("_");
  if (lastUnderscore > 0) {
    return { baseId: species.slice(lastUnderscore + 1), rarity: "rare" };
  }
  return { baseId: species, rarity: "common" };
}

/**
 * Processes all pet and egg sources in the import and returns a map of
 * base species id → the best (highest-level) PetGroup found.
 *
 * Sources: `pets.pet`, `pets.egg`, `available_pets`, `available_eggs`.
 */
function collectPetData(
  pets: unknown,
  availablePets: unknown,
  availableEggs: unknown,
): Record<string, PetGroup> {
  const groups: Record<string, PetGroup> = {};

  const processEntry = (entry: unknown): void => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    const obj = entry as Record<string, unknown>;
    const species = typeof obj.species === "string" && obj.species ? obj.species : null;
    const level = typeof obj.level === "number" ? obj.level : null;
    if (!species || level === null) return;

    const { baseId, rarity } = parsePetSpecies(species);
    const existing = groups[baseId];
    if (!existing || level > existing.level) {
      groups[baseId] = { level, rarity };
    }
  };

  if (pets && typeof pets === "object" && !Array.isArray(pets)) {
    const petsObj = pets as Record<string, unknown>;
    processEntry(petsObj.pet);
    processEntry(petsObj.egg);
  }

  if (Array.isArray(availablePets)) availablePets.forEach(processEntry);
  if (Array.isArray(availableEggs)) availableEggs.forEach(processEntry);

  return groups;
}

/**
 * Returns the rank of a quality string (higher = better).
 * Defaults to 0 (common) for unknown values.
 */
function qualityRank(quality: string): number {
  const index = qualityOptions.findIndex(({ value }) => value === quality);
  return index >= 0 ? index : 0;
}

/**
 * Picks the best (and optionally second-best) quality from a list.
 * When `isRing` is true a second quality is also returned for dual-ring items.
 */
function resolveQualities(
  qualities: string[],
  isRing: boolean,
): { quality: string; quality2: string | null } {
  if (qualities.length === 0) return { quality: "common", quality2: null };

  const sorted = [...qualities].sort((a, b) => qualityRank(b) - qualityRank(a));
  const highest = sorted[0];

  if (!isRing) return { quality: highest, quality2: null };

  return { quality: highest, quality2: sorted[1] ?? null };
}

// ---------------------------------------------------------------------------
// Owned items
// ---------------------------------------------------------------------------

/**
 * Builds an updated owned-items map from all item sources in the import data.
 *
 * - Items not present in `knownItems` are skipped.
 * - When `reset` is true, all existing owned-item entries are first cleared.
 * - The `hidden` flag from `currentOwnedItems` is preserved for each item.
 */
export function parseOwnedItems(
  importData: Pick<
    CharacterImportRaw,
    | "collectibles"
    | "inventory"
    | "bank"
    | "consumables"
    | "gear"
    | "pets"
    | "available_pets"
    | "available_eggs"
  >,
  knownItems: Readonly<Record<string, ItemCatalogEntry>>,
  currentOwnedItems: Readonly<Record<string, OwnedItemEntry>>,
  petsMap: Readonly<Record<string, unknown>>,
  reset: boolean,
): Record<string, OwnedItemEntry> {
  const rawCounts = collectRawItems(
    importData.collectibles,
    importData.inventory,
    importData.bank,
    importData.consumables,
    importData.gear,
  );

  // Group counts by base item id, accumulating all quality variants
  const groups: Record<string, { qualities: string[]; totalCount: number }> =
    {};

  for (const [rawId, count] of Object.entries(rawCounts)) {
    const { baseId, quality } = parseItemId(rawId);
    if (!baseId || !(baseId in knownItems)) continue;

    if (!groups[baseId]) groups[baseId] = { qualities: [], totalCount: 0 };
    for (let i = 0; i < count; i++) groups[baseId].qualities.push(quality);
    groups[baseId].totalCount += count;
  }

  const emptyEntry = (hidden = false): OwnedItemEntry => ({
    owned: false,
    hidden,
    quantity: 0,
    craftedTier: null,
    craftedTier2: null,
    consumableCommon: false,
    consumableFine: false,
    petLevel: null,
    petRarity: null,
  });

  // Start from a shallow copy of the current owned items
  const result: Record<string, OwnedItemEntry> = { ...currentOwnedItems };

  // Optionally reset all existing entries before applying the import
  if (reset) {
    for (const id of Object.keys(result)) {
      const isPet = id in petsMap;
      result[id] = {
        ...emptyEntry(result[id].hidden),
        ...(isPet ? { petLevel: 0, petRarity: "common" } : {}),
      };
    }
  }

  // Apply resolved data for each encountered item
  for (const [baseId, { qualities, totalCount }] of Object.entries(groups)) {
    const itemData = knownItems[baseId];
    if (!itemData) continue;

    const hidden = currentOwnedItems[baseId]?.hidden ?? false;

    if (itemData.type === "consumable") {
      const hasCommon = qualities.includes("common");
      const hasFine = qualities.includes("consumableFine");
      result[baseId] = {
        ...emptyEntry(hidden),
        owned: hasCommon || hasFine,
        quantity: totalCount,
        consumableCommon: hasCommon,
        consumableFine: hasFine,
      };
    } else if (itemData.type === "crafted") {
      const { quality, quality2 } = resolveQualities(
        qualities,
        itemData.gearType === "ring",
      );
      result[baseId] = {
        ...emptyEntry(hidden),
        owned: true,
        quantity: totalCount,
        craftedTier: quality,
        craftedTier2: quality2,
      };
    } else {
      result[baseId] = {
        ...emptyEntry(hidden),
        owned: true,
        quantity: totalCount,
      };
    }
  }

  // Process pets from dedicated pet sections
  const petGroups = collectPetData(
    importData.pets,
    importData.available_pets,
    importData.available_eggs,
  );

  for (const [baseId, { level, rarity }] of Object.entries(petGroups)) {
    if (!(baseId in petsMap)) continue;
    const hidden = currentOwnedItems[baseId]?.hidden ?? false;
    result[baseId] = {
      ...emptyEntry(hidden),
      owned: true,
      quantity: 1,
      petLevel: level,
      petRarity: rarity,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parses all sections of a character import payload into structured data.
 *
 * This function is pure: it does not mutate its inputs, has no side effects,
 * and does not interact with any store or UI layer.
 */
export function parseCharacterImport(
  importData: CharacterImportRaw,
  knownSkillIds: ReadonlyArray<string>,
  factionsMap: Readonly<Record<string, FactionMapEntry>>,
  knownItems: Readonly<Record<string, ItemCatalogEntry>>,
  currentOwnedItems: Readonly<Record<string, OwnedItemEntry>>,
  petsMap: Readonly<Record<string, unknown>>,
  reset: boolean,
): ParsedCharacterImport {
  return {
    characterLevel: parseCharacterLevel(importData.steps),
    skillLevels: parseSkillLevels(importData.skills, knownSkillIds),
    achievementPoints: parseAchievementPoints(importData.achievement_points),
    factionReputations: parseFactionReputations(
      importData.reputation,
      factionsMap,
    ),
    ownedItems: parseOwnedItems(
      {
        collectibles: importData.collectibles,
        inventory: importData.inventory,
        bank: importData.bank,
        consumables: importData.consumables,
        gear: importData.gear,
        pets: importData.pets,
        available_pets: importData.available_pets,
        available_eggs: importData.available_eggs,
      },
      knownItems,
      currentOwnedItems,
      petsMap,
      reset,
    ),
  };
}
