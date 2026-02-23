import { defineStore } from "pinia";
import { upsertOwnedItems, fetchOwnedItems } from "@/utils/axios/db_routes";
import {
  getCategorizedItems,
  getFineMaterials,
  getMaterials,
} from "@/utils/axios/api_routes";
import debounce from "@/utils/debounce";
import { useNotificationStore } from "@/store/notifications";
import type {
  DbOwnedItem,
  ItemCategoryGroup,
  ItemDetail,
  ItemSummary,
} from "@/domain/types";

/**
 * Items Store
 * Manages all item-related data, including categorized items, owned items, materials, and fine materials.
 * Provides actions to fetch item data from the API and update owned items with debounced database flushes.
 * The store also tracks changes to owned items for efficient updates to the backend.
 * Embargoed items are tracked to hide from UI unless imported by the user.
 * Pets are stored in a map for quick access.
 * The store is designed to be efficient and responsive,
 * minimizing unnecessary API calls and database updates while ensuring data consistency across the application.
 *
 * Does NOT:
 * Handle activity, recipe, service, or location data - this is managed by the Activity Store.
 * Directly manage undo/redo operations - this is handled by the History Store
 *
 * */

export type OwnedItemState = Omit<DbOwnedItem, "itemId">;

export type MaterialInfo = Pick<ItemSummary, "icon" | "name">;

export type ToggleItemPayload = {
  itemId: string;
  owned?: boolean;
  hidden?: boolean;
  quality?: string | null;
  quality2?: string | null;
};

export const useItemsStore = defineStore("itemStore", {
  state: () => ({
    categorizedItems: [] as ItemCategoryGroup[],
    itemsByCategory: {} as Record<string, ItemDetail[]>,
    ownedItems: {} as Record<string, OwnedItemState>,
    allGearItems: {} as Record<string, ItemDetail>,
    petsMap: {} as Record<string, ItemDetail>,
    embargoedItems: new Set<string>(),
    changedOwnedItems: {} as Record<string, OwnedItemState>,
    materials: {} as Record<string, MaterialInfo>,
    fineMaterials: {} as Record<string, boolean>,
    isLoaded: false,
  }),
  getters: {
    ownedItemsByCategory:
      (state) =>
      (category: string): ItemDetail[] => {
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
    async fetchItems(): Promise<void> {
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
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `Items: loaded ${Object.keys(this.allGearItems).length} items across ${this.categorizedItems.length} groups, ${Object.keys(this.ownedItems).length} owned, ${Object.keys(this.materials).length} materials`,
      );
    },
    toggleItem({
      itemId,
      owned = true,
      hidden = false,
      quality = null,
      quality2 = null,
    }: ToggleItemPayload): void {
      this.ownedItems[itemId] = { owned, hidden, quality, quality2 };
      this.changedOwnedItems[itemId] = { owned, hidden, quality, quality2 };
      this.scheduleOwnedItemsFlush();
    },
    async flushChangedOwnedItems(): Promise<void> {
      const changed = Object.entries(this.changedOwnedItems).map(
        ([itemId, data]) => {
          return { itemId, ...data };
        },
      );
      if (changed.length === 0) return;

      const notificationStore = useNotificationStore();
      try {
        await upsertOwnedItems({ items: changed });
        void notificationStore.debug(`Items: flushed ${changed.length} owned item change(s) to DB`);
      } catch (error) {
        console.error("error updating owned items", error);
        void notificationStore.debug(`Items: failed to flush ${changed.length} owned item change(s)`, [
          error instanceof Error ? error.message : String(error),
        ]);
      }

      this.changedOwnedItems = {};
    },
    scheduleOwnedItemsFlush: debounce(
      function (this: { flushChangedOwnedItems(): Promise<void> }) {
        this.flushChangedOwnedItems();
      },
      5000,
    ),

    batchUpdateOwnedItems(itemsToUpdate: Record<string, OwnedItemState>): void {
      // Update the ownedItems state
      Object.assign(this.ownedItems, itemsToUpdate);

      // Track all changes for database flush
      Object.assign(this.changedOwnedItems, itemsToUpdate);

      // Schedule a flush to the database
      this.scheduleOwnedItemsFlush();
    },
  },
});
