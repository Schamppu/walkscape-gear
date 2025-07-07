import { defineStore } from "pinia";
import { upsertOwnedItems } from "@/utils/axios/db_routes";
import { getCategorizedItems } from "@/utils/axios/api_routes";
import { fetchOwnedItems } from "@/utils/axios/db_routes";
import debounce from "@/utils/debounce";

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    categorizedItems: [],
    itemsByCategory: {},
    ownedItems: {},
    allItems: {},
    changedOwnedItems: {},
    isLoaded: false,
  }),
  actions: {
    async fetchItems() {
      if (this.isLoaded) return;

      const [{ data: categorizedItems }, ownedItems] = await Promise.all([
        getCategorizedItems(),
        fetchOwnedItems(),
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
  },
});
