import { defineStore } from "pinia";
import { getKeywords, getStats } from "@/utils/axios/api_routes";

export const useDataStore = defineStore("dataStore", {
  state: () => ({
    isLoaded: false,
    keywords: [],
    keywordsMap: {},
    stats: [],
    mainStats: [],
    statsMap: {},
  }),
  getters: {
    getKeywordById: (state) => (id) =>
      (id in state.keywordsMap && state.keywordsMap[id]) || null,
    getStatByType: (state) => (type) =>
      (type in state.statsMap && state.statsMap[type]) || null,
  },
  actions: {
    async fetchGameData() {
      if (this.isLoaded) return;

      const [{ data: keywords }, { data: statList }] = await Promise.all([
        getKeywords(),
        getStats(),
      ]);

      this.keywords = keywords;
      this.keywordsMap = Object.fromEntries(
        keywords.map(({ id, name, icon }) => [id, { name, icon }])
      );

      const filteredStats = ["skillLevel", "travelingDistance"];
      this.stats = statList;
      this.mainStats = statList.filter(
        ({ type }) => !filteredStats.includes(type)
      );
      this.statsMap = Object.fromEntries(
        statList.map(({ type, name, icon }) => [type, { name, icon }])
      );

      this.isLoaded = true;
    },
  },
});
