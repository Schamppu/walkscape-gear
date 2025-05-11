import { defineStore } from "pinia";

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    itemsByCategory: {},
  }),

  actions: {
    setItems(category, items) {
      this.itemsByCategory[category] = items;
    },
  },
});