/**
 * Purpose:
 * This module provides functionality to import character data from a string of valid JSON.
 *
 * Responsibilities:
 * - Convert a JSON string into a JavaScript object.
 * - Parse the character data using domain/character/characterImport.ts.
 * - Validate the imported character data (structure, types, data presence).
 * - Compare parsed values against current store state to detect changes.
 * - Update the player and items stores with any changed data.
 * - Persist changes to the backend.
 * - Notify the user of the success or failure of the import process.
 *
 * Does NOT:
 * - Handle any UI-related logic or presentation of the data.
 * - Contain game calculation or parsing logic (delegated to domain layer).
 */

import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import {
  upsertPlayerStats,
  upsertFactionReputations,
} from "@/utils/axios/db_routes";
import { parseCharacterImport, type OwnedItemEntry } from "@/domain/character/characterImport";
import isEqual from "@/utils/isEqual";

export function useCharacterImport() {
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();
  const notificationStore = useNotificationStore();

  /**
   * Imports character data from a raw JSON string.
   *
   * @param jsonData - Raw JSON export string from the game client.
   * @param reset    - When true, all existing owned items are cleared before
   *                   applying the import.
   */
  function importCharacter(jsonData: string, reset: boolean): void {
    if (!jsonData) {
      notificationStore.error("No import data provided.");
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonData);
    } catch {
      notificationStore.error(
        "Failed to import character data. Please check the file format.",
      );
      return;
    }

    if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
      notificationStore.error("Invalid import format: expected a JSON object.");
      return;
    }

    try {
      // TODO: Remove these casts once the JS stores are migrated to TypeScript
      const skillLevels = playerStore.skillLevels as Record<string, number>;
      const factionReputation = playerStore.factionReputation as Record<string, number>;
      const ownedItems = itemsStore.ownedItems as Record<string, OwnedItemEntry>;

      const result = parseCharacterImport(
        parsedJson,
        Object.keys(skillLevels),
        playerStore.factionsMap,
        itemsStore.allGearItems,
        ownedItems,
        itemsStore.petsMap,
        reset,
      );

      const updatedSections: string[] = [];
      let playerStatsChanged = false;

      // --- Character level ---
      if (result.characterLevel !== null && result.characterLevel !== playerStore.level) {
        playerStore.setCharacterLevel(result.characterLevel);
        updatedSections.push("character level");
        playerStatsChanged = true;
      }

      // --- Skill levels ---
      const changedSkills = Object.entries(result.skillLevels).filter(
        ([id, level]) => skillLevels[id] !== level,
      );
      if (changedSkills.length > 0) {
        const merged: Record<string, number> = { ...skillLevels };
        for (const [id, level] of changedSkills) merged[id] = level;
        playerStore.setSkillLevels(merged);
        updatedSections.push("skills");
        playerStatsChanged = true;
      }

      // --- Achievement points ---
      if (
        result.achievementPoints !== null &&
        result.achievementPoints !== playerStore.achievementPoints
      ) {
        playerStore.setAchievementPoints(result.achievementPoints);
        updatedSections.push("achievement points");
        playerStatsChanged = true;
      }

      // Persist player stats as a single call
      if (playerStatsChanged) {
        upsertPlayerStats({
          ...playerStore.skillLevels,
          level: playerStore.level,
          achievementPoints: playerStore.achievementPoints,
        });
      }

      // --- Faction reputations ---
      const changedReputations = Object.entries(result.factionReputations).filter(
        ([key, val]) => factionReputation[key] !== val,
      );
      if (changedReputations.length > 0) {
        const merged: Record<string, number> = { ...factionReputation };
        for (const [key, val] of changedReputations) merged[key] = val;
        playerStore.setFactionReputations(merged);
        upsertFactionReputations({ reputations: playerStore.factionReputation });
        updatedSections.push("faction reputation");
      }

      // --- Owned items ---
      const changedItems = Object.entries(result.ownedItems).filter(([id, data]) => {
        return !isEqual(ownedItems[id], data);
      });
      if (changedItems.length > 0) {
        const batchUpdate = Object.fromEntries(changedItems);
        itemsStore.batchUpdateOwnedItems(batchUpdate);
        updatedSections.push("items");
      }

      if (updatedSections.length === 0) {
        notificationStore.success("Valid import data, but nothing to update.");
      } else {
        notificationStore.success(
          `Successfully updated: ${updatedSections.join(", ")}.`,
        );
      }
    } catch (e) {
      console.error(e);
      notificationStore.error(
        "Failed to import character data. Please check the file format.",
      );
    }
  }

  return { importCharacter };
}
