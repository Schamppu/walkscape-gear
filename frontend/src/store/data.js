import { defineStore } from "pinia";
import {
  getKeywords,
  getStats,
  getLootTables,
  getMultipleLootTables,
} from "@/utils/axios/api_routes";

export const useDataStore = defineStore("dataStore", {
  state: () => ({
    isLoaded: false,
    keywords: [],
    keywordsMap: {},
    stats: [],
    mainStats: [],
    statsMap: {},
    lootTables: [],
    detailedLootTablesMap: {},
    selectedStat: "none",
  }),
  getters: {
    getKeywordById: (state) => (id) =>
      (id in state.keywordsMap && state.keywordsMap[id]) || null,
    getStatByType: (state) => (type) =>
      (type in state.statsMap && state.statsMap[type]) || null,
    filterStat: (state) => {
      if (state.selectedStat === "none") return null;
      return state.statsMap[state.selectedStat] || null;
    },
    getDetailedLootTable: (state) => (id) =>
      (id in state.detailedLootTablesMap && state.detailedLootTablesMap[id]) ||
      null,
  },
  actions: {
    async fetchGameData() {
      if (this.isLoaded) return;

      const [{ data: keywords }, { data: statList }, { data: lootTables }] =
        await Promise.all([getKeywords(), getStats(), getLootTables()]);

      this.keywords = keywords;
      this.keywordsMap = Object.fromEntries(
        keywords.map(({ id, name, icon, bannedKeywords }) => [
          id,
          { id, name, icon, bannedKeywords },
        ])
      );

      const filteredStats = ["skillLevel", "travelingDistance"];
      this.stats = statList;
      this.mainStats = statList.filter(
        ({ type }) => !filteredStats.includes(type)
      );
      this.statsMap = Object.fromEntries(
        statList.map(({ type, name, icon }) => [type, { name, icon }])
      );

      this.lootTables = lootTables;

      this.isLoaded = true;
    },
    async fetchDetailedLootTables(ids) {
      const uncachedIds = ids.filter(
        (id) => !(id in this.detailedLootTablesMap)
      );

      if (uncachedIds.length > 0) {
        const { data: lootTables } = await getMultipleLootTables(uncachedIds);
        lootTables.forEach((table) => {
          this.detailedLootTablesMap[table.id] = table;
        });
      }

      // Return loot tables in the same order as input ids
      return ids.map((id) => this.detailedLootTablesMap[id]);
    },
  },
});
