import { defineStore } from "pinia";
import {
  getAbilities,
  getKeywords,
  getStats,
  getLootTables,
  getMultipleAbilities,
  getMultipleLootTables,
  getItemValueMap,
  getGlobalVariables,
} from "@/utils/axios/api_routes";
import type { AxiosResponse } from "axios";
import type { AbilityDetail, AbilitySummary } from "@/domain/types/ability";
import type { Keyword } from "@/domain/types/keyword";
import type { StatDefinition } from "@/domain/types/stat";
import type {
  LootTableDetail,
  LootTableSummary,
} from "@/domain/types/lootTable";
import type { ItemValueMap } from "@/domain/types/item";
import { useNotificationStore } from "@/store/notifications";
import { GlobalVariable } from "@/domain/types/global_variable";

/**
 * Centralized store for static game data like abilities, keywords, stats, and loot tables.
 * This data is fetched once and cached for the entire app lifecycle to optimize performance.
 * Provides getters for easy access to data by ID or type, and actions for fetching detailed data on demand.
 *
 * The store also manages loading states for detailed data to prevent redundant API calls and ensure a responsive UI.
 * Detailed data is fetched in batches when multiple IDs are requested, and results are cached for future access.
 *
 * Does NOT:
 * - Manage user selections or activity/recipe/service state (handled by activityStore)
 * - Handle any UI state or interactions directly (should be done in components)
 * - Handle any history/undo-redo logic (should be done in historyStore)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Subset of StatDefinition stored in the lookup map (display fields only). */
type StatEntry = Pick<StatDefinition, "name" | "icon">;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDataStore = defineStore("dataStore", {
  state: () => ({
    isLoaded: false,
    abilities: [] as AbilitySummary[],
    abilitiesMap: {} as Record<string, AbilitySummary>,
    globalVariables: [] as GlobalVariable[],
    globalVariablesMap: {} as Record<string, GlobalVariable>,
    keywords: [] as Keyword[],
    keywordsMap: {} as Record<string, Keyword>,
    stats: [] as StatDefinition[],
    mainStats: [] as StatDefinition[],
    statsMap: {} as Record<string, StatEntry>,
    lootTables: [] as LootTableSummary[],
    loadingData: {} as Record<string, Promise<unknown>>,
    detailedAbilitiesMap: {} as Record<string, AbilityDetail>,
    detailedLootTablesMap: {} as Record<string, LootTableDetail>,
    itemValues: {} as ItemValueMap,
    selectedStat: "none",
  }),

  getters: {
    getKeywordById:
      (state) =>
      (id: string): Keyword | null =>
        (id in state.keywordsMap && state.keywordsMap[id]) || null,

    getStatByType:
      (state) =>
      (type: string): StatEntry | null =>
        (type in state.statsMap && state.statsMap[type]) || null,

    filterStat(state): StatEntry | null {
      if (state.selectedStat === "none") return null;
      return state.statsMap[state.selectedStat] ?? null;
    },

    getDetailedLootTable:
      (state) =>
      (id: string): LootTableDetail | null =>
        (id in state.detailedLootTablesMap &&
          state.detailedLootTablesMap[id]) ||
        null,
  },

  actions: {
    async fetchGameData(): Promise<void> {
      if (this.isLoaded) return;

      const [
        { data: abilities },
        { data: keywords },
        { data: statList },
        { data: lootTables },
        { data: itemValues },
        { data: globalVariables },
      ] = await Promise.all([
        getAbilities(),
        getKeywords(),
        getStats(),
        getLootTables(),
        getItemValueMap(),
        getGlobalVariables(),
      ]);

      this.abilities = abilities;
      this.abilitiesMap = Object.fromEntries(
        abilities.map((ability) => [ability.id, ability]),
      );

      this.globalVariables = globalVariables;
      this.globalVariablesMap = Object.fromEntries(
        globalVariables.map((variable) => [variable.id, variable]),
      );

      this.keywords = keywords;
      this.keywordsMap = Object.fromEntries(
        keywords.map(({ id, name, icon, bannedKeywords }) => [
          id,
          { id, name, icon, bannedKeywords },
        ]),
      );

      const hiddenStatTypes = new Set([
        "skillLevel",
        "travelingDistance",
        "countsAsKeyword",
      ]);
      this.stats = statList;
      this.mainStats = statList.filter(
        ({ type }) => !hiddenStatTypes.has(type),
      );
      this.statsMap = Object.fromEntries(
        statList.map(({ type, name, icon }) => [type, { name, icon }]),
      );

      this.lootTables = lootTables;
      this.itemValues = itemValues;
      this.isLoaded = true;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `Data: loaded ${this.abilities.length} abilities, ${this.keywords.length} keywords, ${this.stats.length} stats (${this.mainStats.length} main), ${this.lootTables.length} loot tables`,
      );
    },

    async fetchDetailedData<T extends { id: string }>(
      ids: string[],
      categoryIds: Record<string, unknown>,
      detailedMap: Record<string, T>,
      fetchFn: (ids: string[]) => Promise<AxiosResponse<T[]>>,
    ): Promise<(T | undefined)[]> {
      const validIds = ids.filter((id) => id in categoryIds);
      const uncachedIds = validIds.filter(
        (id) => !(id in detailedMap || id in this.loadingData),
      );

      if (uncachedIds.length > 0) {
        const notificationStore = useNotificationStore();
        void notificationStore.debug(
          `Data: fetching ${uncachedIds.length} uncached item(s) - ${uncachedIds.length < 5 ? uncachedIds.join(", ") : `${uncachedIds.slice(0, 4).join(", ")} +${uncachedIds.length - 4} more`}`,
        );
        const batchPromise = fetchFn(uncachedIds)
          .then(({ data }) => {
            data.forEach((obj) => {
              detailedMap[obj.id] = obj;
              delete this.loadingData[obj.id];
            });
          })
          .catch(() => {
            uncachedIds.forEach((id) => delete this.loadingData[id]);
          });

        validIds.forEach((id) => {
          this.loadingData[id] = batchPromise.then(() => detailedMap[id]);
        });

        return Promise.all(
          validIds.map((id) =>
            id in detailedMap
              ? Promise.resolve(detailedMap[id])
              : (this.loadingData[id] as Promise<T | undefined>),
          ),
        );
      }

      return validIds.map((id) => detailedMap[id]);
    },

    async fetchDetailedLootTables(
      ids: string[],
    ): Promise<(LootTableDetail | undefined)[]> {
      const idMap = Object.fromEntries(
        this.lootTables.map(({ id }) => [id, true]),
      );
      return this.fetchDetailedData(
        ids,
        idMap,
        this.detailedLootTablesMap,
        getMultipleLootTables,
      );
    },

    async fetchDetailedAbilities(
      ids: string[],
    ): Promise<(AbilityDetail | undefined)[]> {
      const idMap = Object.fromEntries(
        this.abilities.map(({ id }) => [id, true]),
      );
      return this.fetchDetailedData(
        ids,
        idMap,
        this.detailedAbilitiesMap,
        getMultipleAbilities,
      );
    },
  },
});
