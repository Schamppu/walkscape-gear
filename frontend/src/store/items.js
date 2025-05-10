import { defineStore } from "pinia";

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    collectibles: [],
    crafted: [],
    loot: [],
  }),
  actions: {
    setItems(category, items) {
      this.$patch({
        [category]: items,
      });
    },
  },
});
