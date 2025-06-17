import { defineStore } from "pinia";
import { upsertOwnedItems } from "@/utils/axios/db_routes";
import debounce from "@/utils/debounce";

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    itemsByCategory: {},
    ownedItems: {},
    allItems: {},
    changedOwnedItems: {},
  }),
  actions: {
    setItems(category, items) {
      this.itemsByCategory[category] = items;
      items.forEach((item) => {
        this.allItems[item.id] = item;
      });
    },
    setOwned(itemId, data) {
      this.ownedItems[itemId] = data;
    },
    setOwnedItems(items) {
      items.forEach(({ itemId, ...data }) => this.setOwned(itemId, data));
    },
    toggleItem(itemId, owned = true, quality = null, quality2 = null) {
      this.ownedItems[itemId] = { owned, quality, quality2 };
      this.changedOwnedItems[itemId] = { owned, quality, quality2 };
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
        this.setOwned(changed);
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
