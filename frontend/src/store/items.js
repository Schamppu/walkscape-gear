import { defineStore } from "pinia";
import { upsertOwnedItems } from "@/utils/axios/db_routes";
import {
  getCategorizedItems,
  getFineMaterials,
} from "@/utils/axios/api_routes";
import { fetchOwnedItems } from "@/utils/axios/db_routes";
import debounce from "@/utils/debounce";

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    categorizedItems: [],
    itemsByCategory: {},
    ownedItems: {},
    allItems: {},
    changedOwnedItems: {},
    fineMaterials: {},
    isLoaded: false,
  }),
  getters: {
    ownedCollectibles: (state) => {
      return Object.fromEntries(
        state.categorizedItems
          .find(({ title }) => title.toLowerCase() === "collectibles")
          .categories.flatMap(({ items }) =>
            items.map((item) => [item.id, item.id in state.ownedItems])
          )
      );
    },
  },
  actions: {
    async fetchItems() {
      if (this.isLoaded) return;

      const [{ data: categorizedItems }, ownedItems, { data: fineMaterials }] =
        await Promise.all([
          getCategorizedItems(),
          fetchOwnedItems(),
          getFineMaterials(),
        ]);

      this.ownedItems = Object.fromEntries(
        ownedItems.map(({ itemId, ...data }) => [itemId, data])
      );
      this.categorizedItems = categorizedItems;

      const categories = categorizedItems.flatMap(
        ({ categories }) => categories
      );
      this.itemsByCategory = Object.fromEntries(
        categories.map(({ key, items }) => [key, items])
      );
      this.allItems = Object.fromEntries(
        categories.flatMap(({ items }) => items).map((item) => [item.id, item])
      );
      this.fineMaterials = Object.fromEntries(
        fineMaterials.map((id) => [id, true])
      );

      this.isLoaded = true;
    },
    toggleItem({
      itemId,
      owned = true,
      hidden = false,
      quality = null,
      quality2 = null,
    }) {
      this.ownedItems[itemId] = { owned, hidden, quality, quality2 };
      this.changedOwnedItems[itemId] = { owned, hidden, quality, quality2 };
      this.scheduleOwnedItemsFlush();
    },
    async flushChangedOwnedItems() {
      const changed = Object.entries(this.changedOwnedItems).map(
        ([itemId, data]) => {
          return { itemId, ...data };
        }
      );
      if (changed.length === 0) return;

      try {
        await upsertOwnedItems({ items: changed });
      } catch (error) {
        console.error("error updating owned items", error);
      }

      this.changedOwnedItems = {};
    },
    scheduleOwnedItemsFlush: debounce(
      function () {
        this.flushChangedOwnedItems();
      },
      5000,
      this
    ),

    batchUpdateOwnedItems(itemsToUpdate) {
      // Update the ownedItems state
      Object.assign(this.ownedItems, itemsToUpdate);

      // Track all changes for database flush
      Object.assign(this.changedOwnedItems, itemsToUpdate);

      // Schedule a flush to the database
      this.scheduleOwnedItemsFlush();
    },
  },
});
