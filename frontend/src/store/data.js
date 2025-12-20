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
    async fetchDetailedAbilities(ids) {
      const validIds = ids.filter(
        (id) =>
          this.abilities.findIndex(({ id: abilityId }) => id === abilityId) >= 0
      );

      const uncachedIds = validIds.filter(
        (id) => !(id in this.detailedAbilitiesMap || id in this.loadingData)
      );

      if (uncachedIds.length > 0) {
        const batchPromise = getMultipleAbilities(uncachedIds)
          .then(({ data: abilities }) => {
            abilities.forEach((ability) => {
              const { id } = ability;
              this.detailedAbilitiesMap[id] = ability;
              delete this.loadingData.id;
              return ability;
            });
            return abilities;
          })
          .catch(() => {
            uncachedIds.forEach((id) => delete this.loadingData[id]);
            return [];
          });

        uncachedIds.forEach(
          (id) =>
            (this.loadingData[id] = batchPromise.then(
              () => this.detailedAbilitiesMap[id]
            ))
        );

        return Promise.all(
          uncachedIds.map((id) =>
            id in this.detailedAbilitiesMap
              ? Promise.resolve(this.detailedAbilitiesMap[id])
              : this.loadingData[id]
          )
        );
      }
      return validIds.map((id) => this.detailedAbilitiesMap[id]);
    },
  },
});
