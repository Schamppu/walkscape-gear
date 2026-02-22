import { defineStore } from "pinia";
import { getItem, searchItems, getPet } from "@/utils/axios/api_routes";
import { useItemsStore } from "./items";
import {
  EquipItemCommand,
  UnequipAllCommand,
  EquipMultipleCommand,
} from "./gearCommands";
import { createEmptyGearSet } from "@/utils/createEmptyGearSet";
import { getPetIcon } from "@/domain/pets/getPetIcon";

// Lazy import for history store to avoid circular dependencies
let useHistoryStore = null;
const getHistoryStore = async () => {
  if (!useHistoryStore) {
    try {
      const module = await import("@/store/history");
      useHistoryStore = module.useHistoryStore;
    } catch {
      console.debug("History store not available");
      return null;
    }
  }
  return useHistoryStore?.();
};

export const useGearStore = defineStore("gearStore", {
  state: () => ({
    gearSlots: [createEmptyGearSet(), createEmptyGearSet()],
    gearSetIndex: 0,
    // Cache for fetched items to avoid refetching
    itemCache: new Map(),
  }),
  getters: {
    selectedGearset(state) {
      return state.gearSlots[this.gearSetIndex];
    },
    bothSetsActive(state) {
      return state.gearSlots.every(
        (set) => Object.values(set).filter(Boolean).length
      );
    },
    hasGearEquipped() {
      return (
        Object.entries(this.selectedGearset).filter(
          ([key, value]) => key !== "service" && value !== null
        ).length > 0
      );
    },
    equippedGear() {
      return Object.values(this.selectedGearset).filter(Boolean) || [];
    },
    filledGearSlots() {
      return Object.entries(this.selectedGearset).filter(([, item]) =>
        Boolean(item)
      );
    },
    gearset: (state) => (index) => state.gearSlots[index],
    equippedGearByIndex: (state) => (index) =>
      Object.values(state.gearSlots[index]).filter(Boolean),
    filledGearSlotsByIndex: (state) => (index) =>
      Object.entries(state.gearSlots[index]).filter(([, item]) =>
        Boolean(item)
      ),
  },
  actions: {
    get(slot) {
      return this.selectedGearset[slot];
    },
    setGearSlot(slot, item) {
      const previousItem = this.selectedGearset[slot];

      // Create and execute command
      const command = new EquipItemCommand(this, slot, item, previousItem);
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setGearSlotDirect(slot, item) {
      this.selectedGearset[slot] = item;
    },
    updateStats(slot, data) {
      const { itemAttrs } = data;
      this.selectedGearset[slot].itemAttrs = itemAttrs;
    },
    slotFilled(slot) {
      return !!this.selectedGearset[slot];
    },
    getSlotTypes(slot) {
      if (slot === "service") return ["service"];
      else if (slot === "pet") return ["pet"];
      else if (slot === "consumable") return ["consumable"];
      return ["loot", "crafted"];
    },
    getSearchEndpoint(slot) {
      if (slot === "service") return () => ({ name: "None", id: "-1" });
      return searchItems;
    },

    determineQuality(id, q2 = false) {
      const itemsStore = useItemsStore();
      const owned = id in itemsStore.ownedItems;
      if (!owned)
        return id in itemsStore.allGearItems
          ? itemsStore.allGearItems[id].quality
          : "common";
      const entry = itemsStore.ownedItems[id];
      let quality = "common";
      if (entry.quality) quality = entry.quality;
      if (q2 && entry.quality2) quality = entry.quality2;
      return quality;
    },

    _getCacheKey(id, quality) {
      return `${id}_${quality || "default"}`;
    },

    _getFromCache(id, quality) {
      const cacheKey = this._getCacheKey(id, quality);
      return this.itemCache.get(cacheKey);
    },

    _setInCache(id, quality, itemData) {
      const cacheKey = this._getCacheKey(id, quality);
      this.itemCache.set(cacheKey, itemData);
    },

    async _fetchAndSetItem(itemSlot, id, quality) {
      // Check cache first
      const cachedItem = this._getFromCache(id, quality);
      if (cachedItem) {
        this._setGearSlotDirect(itemSlot, cachedItem);
        return cachedItem;
      }

      // Fetch from API

      const { data } = await getItem({ id });
      if (data) {
        const itemData = { ...data, quality };
        this._setInCache(id, quality, itemData);
        this._setGearSlotDirect(itemSlot, itemData);
        return itemData;
      }
      return null;
    },

    // Batch fetch items (ready for future bulk endpoint)
    async _fetchMultipleItems(itemRequests) {
      // For now, we'll use Promise.all with individual calls
      // TODO: Replace with bulk endpoint when available
      const fetchPromises = itemRequests.map(async ({ id, quality }) => {
        // Check cache first
        const cachedItem = this._getFromCache(id, quality);
        if (cachedItem) {
          return { id, quality, data: cachedItem };
        }

        // Fetch from API
        try {
          const itemsStore = useItemsStore();
          const isPet = id in itemsStore.petsMap;
          const loadFn = isPet ? getPet : getItem;
          const { data } = await loadFn({ id });
          const icon = isPet ? getPetIcon(data, quality) : data.icon;

          if (data) {
            const itemData = { ...data, quality, icon };
            this._setInCache(id, quality, itemData);
            return { id, quality, data: itemData };
          }
        } catch (error) {
          console.error(`Failed to fetch item ${id}:`, error);
        }
        return { id, quality, data: null };
      });

      return Promise.all(fetchPromises);
    },

    async loadItem(itemSlot, id, itemQuality = null, itemQuality2 = null) {
      if (!id) {
        console.error("no id provided");
        return;
      }
      const isPet = itemSlot === "pet";

      const itemsStore = useItemsStore();
      if (!(id in itemsStore.allGearItems)) return;

      const previousItem = this.selectedGearset[itemSlot];
      if (previousItem?.id === id && previousItem.quality === itemQuality)
        return;

      const quality = itemQuality || this.determineQuality(id);
      const quality2 = itemQuality2 || this.determineQuality(id, true);

      // Fetch the item data first
      const cachedItem = this._getFromCache(id, quality);
      let itemData = cachedItem;

      if (!itemData) {
        const loadFn = isPet ? getPet : getItem;
        const { data } = await loadFn({ id });
        const icon = isPet ? getPetIcon(data, quality) : data.icon;

        if (data) {
          itemData = { ...data, icon, quality, quality2 };
          this._setInCache(id, quality, itemData);
        }
      }

      if (itemData) {
        // Use command system to track this change
        const command = new EquipItemCommand(
          this,
          itemSlot,
          itemData,
          previousItem
        );
        this._executeCommand(command);
      }
    },

    unequipAll() {
      const previousGearSlots = { ...this.selectedGearset };

      // Create and execute command
      const command = new UnequipAllCommand(this, previousGearSlots);
      this._executeCommand(command);
    },

    // Direct setter for all slots that doesn't record history (used by commands)
    _setAllGearSlotsDirect(gearSlots) {
      const newGearSlots = Object.fromEntries(
        Object.keys(this.selectedGearset).map((slot) => [
          slot,
          gearSlots[slot] || null,
        ])
      );
      this.gearSlots[this.gearSetIndex] = newGearSlots;
    },

    async equipMultiple(gearSetData, useQuality = false) {
      const previousGearSlots = { ...this.selectedGearset };

      // Process the gear set data first
      const processedGearSlots = await this._processGearSetData(
        gearSetData,
        useQuality
      );

      // Create and execute command
      const command = new EquipMultipleCommand(
        this,
        processedGearSlots,
        previousGearSlots
      );
      this._executeCommand(command);
    },

    // Direct equip multiple that doesn't record history (used by commands)
    async _equipMultipleDirect(gearSetData) {
      // Apply all changes at once to minimize reactive updates
      const completeGearSlots = { ...this.selectedGearset };
      Object.assign(completeGearSlots, gearSetData);
      this.gearSlots[this.gearSetIndex] = completeGearSlots;
    },

    // Optimized batch update for both gear and cache operations
    async _batchUpdateGearState(gearSetData, cacheOperations = null) {
      // Perform cache operations first if provided (batch them)
      if (cacheOperations && cacheOperations.length > 0) {
        // Batch cache updates to minimize Map operations
        cacheOperations.forEach(({ id, quality, data }) => {
          this._setInCache(id, quality, data);
        });
      }

      // Apply all gear changes at once to minimize reactive updates
      const completeGearSlots = { ...this.selectedGearset };
      Object.assign(completeGearSlots, gearSetData);
      this.gearSlots[this.gearSetIndex] = completeGearSlots;
    }, // Helper method to process gear set data (extracted from equipMultiple)
    async _processGearSetData(gearSetData, useQuality = false) {
      const itemsStore = useItemsStore();

      // Step 1: Determine what needs to be fetched vs what can be set directly
      const itemsToFetch = [];
      const finalGearSlots = {};

      for (const [slot, item] of Object.entries(gearSetData)) {
        if (!item || !item.id) {
          // Empty slot
          finalGearSlots[slot] = null;
          continue;
        }

        // Skip if item doesn't exist in allItems
        if (!(item.id in itemsStore.allGearItems)) {
          finalGearSlots[slot] = null;
          continue;
        }

        const quality = useQuality ? item.quality : null;
        const resolvedQuality = quality || this.determineQuality(item.id);

        // Check if this item is already equipped with the same quality
        const currentItem = this.selectedGearset[slot];
        if (
          currentItem?.id === item.id &&
          currentItem.quality === resolvedQuality
        ) {
          // Keep the current item (no change needed)
          finalGearSlots[slot] = currentItem;
          continue;
        }

        // Check if we have this item in cache
        const cachedItem = this._getFromCache(item.id, resolvedQuality);
        if (cachedItem) {
          finalGearSlots[slot] = cachedItem;
        } else {
          // Need to fetch this item
          itemsToFetch.push({
            slot,
            id: item.id,
            quality: resolvedQuality,
          });
        }
      }

      // Step 2: Batch fetch all items that need to be fetched
      if (itemsToFetch.length > 0) {
        const uniqueRequests = itemsToFetch.filter(
          (item, index, self) =>
            index ===
            self.findIndex(
              (i) => i.id === item.id && i.quality === item.quality
            )
        );

        const fetchedItems = await this._fetchMultipleItems(uniqueRequests);
        const fetchedItemsMap = new Map();

        fetchedItems.forEach(({ id, quality, data }) => {
          if (data) {
            fetchedItemsMap.set(this._getCacheKey(id, quality), data);
          }
        });

        // Assign fetched items to their slots
        itemsToFetch.forEach(({ slot, id, quality }) => {
          const cacheKey = this._getCacheKey(id, quality);
          finalGearSlots[slot] = fetchedItemsMap.get(cacheKey) || null;
        });
      }

      return finalGearSlots;
    },

    // Method to clear the item cache if needed
    clearItemCache() {
      this.itemCache.clear();
    },

    // Method to remove specific items from cache
    removeFromCache(id, quality = null) {
      if (quality) {
        const cacheKey = this._getCacheKey(id, quality);
        this.itemCache.delete(cacheKey);
      } else {
        // Remove all qualities of this item
        const keysToDelete = [];
        for (const key of this.itemCache.keys()) {
          if (key.startsWith(`${id}_`)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => this.itemCache.delete(key));
      }
    },

    // Command execution and history management
    async _executeCommand(command) {
      try {
        const historyStore = await getHistoryStore();

        // Execute the command
        await command.execute();

        // Record in history if available
        if (historyStore) {
          historyStore.recordCommand(command);
        }
      } catch (error) {
        console.error("Failed to execute command:", error);
      }
    },

    async initializeHistoryTracking() {
      try {
        const historyStore = await getHistoryStore();
        if (!historyStore) {
          console.debug("History store not available");
          return false;
        }

        return true;
      } catch (error) {
        console.debug("Failed to initialize history tracking:", error);
        return false;
      }
    },
  },
});
