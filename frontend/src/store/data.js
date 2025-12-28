import { defineStore } from "pinia";
import {
  getAbilities,
  getKeywords,
  getStats,
  getLootTables,
  getMultipleAbilities,
  getMultipleLootTables,
} from "@/utils/axios/api_routes";

export const useDataStore = defineStore("dataStore", {
  state: () => ({
    isLoaded: false,
    abilities: [],
    abilitiesMap: {},
    keywords: [],
    keywordsMap: {},
    stats: [],
    mainStats: [],
    statsMap: {},
    lootTables: [],
    loadingData: {},
    detailedAbilitiesMap: {},
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

      const [
        { data: abilities },
        { data: keywords },
        { data: statList },
        { data: lootTables },
      ] = await Promise.all([
        getAbilities(),
        getKeywords(),
        getStats(),
        getLootTables(),
      ]);

      this.abilities = abilities;
      this.abilitiesMap = Object.fromEntries(
        abilities.map((ability) => {
          const { id } = ability;
          return [id, ability];
        })
      );

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
    async fetchDetailedData(ids, categoryIds, detailedMap, fetchFn) {
      const validIds = ids.filter((id) => id in categoryIds);
      const uncachedIds = validIds.filter(
        (id) => !(id in detailedMap || id in this.loadingData)
      );

      if (uncachedIds.length > 0) {
        const batchPromise = fetchFn(uncachedIds)
          .then(({ data }) => {
            data.forEach((obj) => {
              const { id } = obj;
              detailedMap[id] = obj;
              delete this.loadingData.id;
              return obj;
            });
            return data;
          })
          .catch(() => {
            uncachedIds.forEach((id) => delete this.loadingData[id]);
            return [];
          });

        validIds.forEach(
          (id) =>
            (this.loadingData[id] = batchPromise.then(() => detailedMap[id]))
        );

        return Promise.all(
          validIds.map((id) =>
            id in detailedMap
              ? Promise.resolve(detailedMap[id])
              : this.loadingData[id]
          )
        );
      }
      return validIds.map((id) => detailedMap[id]);
    },
    async fetchDetailedLootTables(ids) {
      const idMap = Object.fromEntries(
        this.lootTables.map(({ id }) => [id, true])
      );
      return this.fetchDetailedData(
        ids,
        idMap,
        this.detailedLootTablesMap,
        getMultipleLootTables
      );
    },
    async fetchDetailedAbilities(ids) {
      const idMap = Object.fromEntries(
        this.abilities.map(({ id }) => [id, true])
      );
      return this.fetchDetailedData(
        ids,
        idMap,
        this.detailedAbilitiesMap,
        getMultipleAbilities
      );
    },
  },
});
