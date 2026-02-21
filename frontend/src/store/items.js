import { defineStore } from "pinia";
import { upsertOwnedItems } from "@/utils/axios/db_routes";
import {
  getCategorizedItems,
  getFineMaterials,
  getMaterials,
} from "@/utils/axios/api_routes";
import { fetchOwnedItems } from "@/utils/axios/db_routes";
import debounce from "@/utils/debounce.ts";

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    categorizedItems: [],
    itemsByCategory: {},
    ownedItems: {},
    allGearItems: {},
    petsMap: {},
    embargoedItems: new Set(),
    changedOwnedItems: {},
    materials: {},
    fineMaterials: {},
    isLoaded: false,
  }),
  getters: {
    ownedItemsByCategory: (state) => (category) => {
      return Object.entries(state.itemsByCategory)
        .filter(([itemCategory]) =>
          itemCategory.toLowerCase().includes(category),
        )
        .flatMap(([, items]) =>
          items.filter((item) => item.id in state.ownedItems),
        );
    },
  },
  actions: {
    async fetchItems() {
      if (this.isLoaded) return;

      const [
        { data: categorizedItems },
        ownedItems,
        { data: materials },
        { data: fineMaterials },
      ] = await Promise.all([
        getCategorizedItems(),
        fetchOwnedItems(),
        getMaterials(),
        getFineMaterials(),
      ]);

      this.ownedItems = Object.fromEntries(
        ownedItems.map(({ itemId, ...data }) => [itemId, data]),
      );
      this.categorizedItems = categorizedItems;

      const categories = categorizedItems.flatMap(
        ({ categories }) => categories,
      );
      this.itemsByCategory = Object.fromEntries(
        categories.map(({ key, items }) => [key, items]),
      );
      this.allGearItems = Object.fromEntries(
        categories.flatMap(({ items }) => items).map((item) => [item.id, item]),
      );
      this.embargoedItems = new Set(
        Object.values(this.allGearItems)
          .filter((item) => "embargo" in item)
          .map(({ id }) => id),
      );
      this.materials = Object.fromEntries(
        materials.map(({ id, icon, name }) => [id, { icon, name }]),
      );
      this.fineMaterials = Object.fromEntries(
        fineMaterials.map((id) => [id, true]),
      );
      this.petsMap = Object.fromEntries(
        this.itemsByCategory["pets"].map((pet) => [pet.id, pet]),
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
        },
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
      this,
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
