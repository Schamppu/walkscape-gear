import { defineStore } from "pinia";
import { getItem, searchItems, getPet } from "@/utils/axios/api_routes";
import { useItemsStore } from "./items";
import {
  EquipItemCommand,
  UnequipAllCommand,
  EquipMultipleCommand,
} from "./commands/gearCommands";
import { createEmptyGearSet, type GearSet } from "@/domain/gear/gearSet";
import { getPetIcon } from "@/domain/pets/getPetIcon";
import type { ItemDetail } from "@/domain/types/item";
import type { PetDetail } from "@/domain/types/pet";
import type { GearSlot } from "@/domain/constants/gear";
import type { Command } from "./commands/types";
import { executeCommand, initializeHistoryTracking } from "@/store/utils/historyUtils";
import { useNotificationStore } from "@/store/notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An item as it lives in a gear slot - enriched with quality and a resolved icon. */
export type EquippedItem = (ItemDetail | PetDetail) & {
  quality: string | null;
  quality2?: string | null;
  icon: string;
};

/** A fully-typed gear set where every slot holds an item or null. */
export type EquippedGearSet = Record<GearSlot, EquippedItem | null>;

type FetchRequest = {
  slot: string;
  id: string;
  quality: string | null;
};

type FetchResult = {
  id: string;
  quality: string | null;
  data: EquippedItem | null;
};

type CacheOperation = {
  id: string;
  quality: string | null;
  data: EquippedItem;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGearStore = defineStore("gearStore", {
  state: () => ({
    gearSlots: [createEmptyGearSet(), createEmptyGearSet()] as EquippedGearSet[],
    gearSetIndex: 0,
    // Cache for fetched items to avoid refetching
    itemCache: new Map<string, EquippedItem>(),
    // Locked slots per gear set - items in locked slots are skipped by the optimiser and unequip all
    lockedSlots: [[] as GearSlot[], [] as GearSlot[]],
  }),
  getters: {
    selectedGearset(state): EquippedGearSet {
      return state.gearSlots[this.gearSetIndex] as EquippedGearSet;
    },
    bothSetsActive(state): boolean {
      return state.gearSlots.every(
        (set) => Object.values(set).filter(Boolean).length
      );
    },
    hasGearEquipped(): boolean {
      return (
        Object.entries(this.selectedGearset).filter(
          ([key, value]) => key !== "service" && value !== null
        ).length > 0
      );
    },
    equippedGear(): EquippedItem[] {
      return (Object.values(this.selectedGearset).filter(Boolean) as EquippedItem[]) || [];
    },
    filledGearSlots(): [string, EquippedItem][] {
      return Object.entries(this.selectedGearset).filter(([, item]) =>
        Boolean(item)
      ) as [string, EquippedItem][];
    },
    isSlotLocked: (state) => (slot: GearSlot): boolean =>
      state.lockedSlots[state.gearSetIndex]?.includes(slot) ?? false,
    gearset: (state) => (index: number): EquippedGearSet =>
      state.gearSlots[index] as EquippedGearSet,
    equippedGearByIndex: (state) => (index: number): EquippedItem[] =>
      Object.values(state.gearSlots[index]).filter(Boolean) as EquippedItem[],
    filledGearSlotsByIndex: (state) => (index: number): [string, EquippedItem][] =>
      Object.entries(state.gearSlots[index]).filter(([, item]) =>
        Boolean(item)
      ) as [string, EquippedItem][],
  },
  actions: {
    get(slot: GearSlot): EquippedItem | null {
      return this.selectedGearset[slot];
    },
    setGearSlot(slot: GearSlot, item: EquippedItem | null): void {
      const previousItem = this.selectedGearset[slot];

      // Create and execute command
      const command = new EquipItemCommand(this, slot, item, previousItem);
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setGearSlotDirect(slot: GearSlot, item: EquippedItem | null): void {
      (this.selectedGearset as GearSet)[slot] = item;
    },
    updateStats(slot: GearSlot, data: Pick<ItemDetail, "itemAttrs">): void {
      const { itemAttrs } = data;
      const item = this.selectedGearset[slot];
      if (item && "itemAttrs" in item) {
        (item as ItemDetail).itemAttrs = itemAttrs;
      }
    },
    slotFilled(slot: GearSlot): boolean {
      return !!this.selectedGearset[slot];
    },
    getSlotTypes(slot: GearSlot): string[] {
      if (slot === "service") return ["service"];
      else if (slot === "pet") return ["pet"];
      else if (slot === "consumable") return ["consumable"];
      return ["loot", "crafted"];
    },
    getSearchEndpoint(
      slot: GearSlot,
    ): typeof searchItems | (() => { name: string; id: string }) {
      if (slot === "service") return () => ({ name: "None", id: "-1" });
      return searchItems;
    },

    determineQuality(id: string, q2 = false): string {
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

    _getCacheKey(id: string, quality: string | null): string {
      return `${id}_${quality || "default"}`;
    },

    _getFromCache(id: string, quality: string | null): EquippedItem | undefined {
      const cacheKey = this._getCacheKey(id, quality);
      return this.itemCache.get(cacheKey);
    },

    _setInCache(id: string, quality: string | null, itemData: EquippedItem): void {
      const cacheKey = this._getCacheKey(id, quality);
      this.itemCache.set(cacheKey, itemData);
    },

    async _fetchAndSetItem(
      itemSlot: GearSlot,
      id: string,
      quality: string | null,
    ): Promise<EquippedItem | null> {
      // Check cache first
      const cachedItem = this._getFromCache(id, quality);
      if (cachedItem) {
        this._setGearSlotDirect(itemSlot, cachedItem);
        return cachedItem;
      }

      const { data } = await getItem({ id });
      if (data) {
        const itemData = { ...data, quality } as EquippedItem;
        this._setInCache(id, quality, itemData);
        this._setGearSlotDirect(itemSlot, itemData);
        return itemData;
      }
      return null;
    },

    // Batch fetch items (ready for future bulk endpoint)
    async _fetchMultipleItems(itemRequests: FetchRequest[]): Promise<FetchResult[]> {
      // For now, we'll use Promise.all with individual calls
      // TODO: Replace with bulk endpoint when available
      const fetchPromises = itemRequests.map(async ({ id, quality }): Promise<FetchResult> => {
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
          const icon = isPet
            ? getPetIcon(data as unknown as Parameters<typeof getPetIcon>[0], quality as unknown as number)
            : (data as ItemDetail).icon;

          if (data) {
            const itemData: EquippedItem = { ...data, quality, icon } as EquippedItem;
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

    async loadItem(
      itemSlot: GearSlot,
      id: string,
      itemQuality: string | null = null,
      itemQuality2: string | null = null,
    ): Promise<void> {
      if (!id) {
        console.error("no id provided");
        return;
      }
      const isPet = itemSlot === "pet";

      const itemsStore = useItemsStore();
      if (!(id in itemsStore.allGearItems)) return;

      const previousItem = this.selectedGearset[itemSlot];
      if (previousItem?.id === id && previousItem.quality === itemQuality) return;

      const quality = itemQuality || this.determineQuality(id);
      const quality2 = itemQuality2 || this.determineQuality(id, true);

      // Fetch the item data first
      const cachedItem = this._getFromCache(id, quality);
      let itemData: EquippedItem | null = cachedItem ?? null;

      if (!itemData) {
        const loadFn = isPet ? getPet : getItem;
        const { data } = await loadFn({ id });
        const icon = isPet
          ? getPetIcon(data as unknown as Parameters<typeof getPetIcon>[0], quality as unknown as number)
          : (data as ItemDetail).icon;

        if (data) {
          itemData = { ...data, icon, quality, quality2 } as EquippedItem;
          this._setInCache(id, quality, itemData);
          const notificationStore = useNotificationStore();
          void notificationStore.debug(`Gear: fetched "${(data as ItemDetail).name}" (${id}) for slot ${itemSlot}`);
        }
      }

      if (itemData) {
        // Use command system to track this change
        const command = new EquipItemCommand(this, itemSlot, itemData, previousItem);
        this._executeCommand(command);
      }
    },

    unequipAll(): void {
      const previousGearSlots = { ...this.selectedGearset };

      // Create and execute command
      const command = new UnequipAllCommand(this, previousGearSlots);
      this._executeCommand(command);
    },

    // Direct setter for all slots that doesn't record history (used by commands)
    _setAllGearSlotsDirect(gearSlots: Record<string, EquippedItem | null>): void {
      const newGearSlots = Object.fromEntries(
        Object.keys(this.selectedGearset).map((slot) => [
          slot,
          gearSlots[slot] ?? null,
        ])
      ) as EquippedGearSet;
      this.gearSlots[this.gearSetIndex] = newGearSlots;
    },

    async equipMultiple(
      gearSetData: Record<string, { id?: string; quality?: string | null } | null>,
      useQuality = false,
    ): Promise<void> {
      const previousGearSlots = { ...this.selectedGearset };

      // Process the gear set data first
      const processedGearSlots = await this._processGearSetData(gearSetData, useQuality);

      // Create and execute command
      const command = new EquipMultipleCommand(this, processedGearSlots, previousGearSlots);
      this._executeCommand(command);
    },

    // Direct equip multiple that doesn't record history (used by commands)
    async _equipMultipleDirect(gearSetData: Record<string, EquippedItem | null>): Promise<void> {
      // Apply all changes at once to minimize reactive updates
      const completeGearSlots = { ...this.selectedGearset, ...gearSetData } as EquippedGearSet;
      this.gearSlots[this.gearSetIndex] = completeGearSlots;
    },

    // Optimized batch update for both gear and cache operations
    async _batchUpdateGearState(
      gearSetData: Record<string, EquippedItem | null>,
      cacheOperations: CacheOperation[] | null = null,
    ): Promise<void> {
      // Perform cache operations first if provided (batch them)
      if (cacheOperations && cacheOperations.length > 0) {
        cacheOperations.forEach(({ id, quality, data }) => {
          this._setInCache(id, quality, data);
        });
      }

      // Apply all gear changes at once to minimize reactive updates
      const completeGearSlots = { ...this.selectedGearset, ...gearSetData } as EquippedGearSet;
      this.gearSlots[this.gearSetIndex] = completeGearSlots;
    },

    async _processGearSetData(
      gearSetData: Record<string, { id?: string; quality?: string | null } | null>,
      useQuality = false,
    ): Promise<Record<string, EquippedItem | null>> {
      const itemsStore = useItemsStore();

      const itemsToFetch: FetchRequest[] = [];
      const finalGearSlots: Record<string, EquippedItem | null> = {};

      for (const [slot, item] of Object.entries(gearSetData)) {
        if (this.isSlotLocked(slot as GearSlot)) {
          finalGearSlots[slot] = this.selectedGearset[slot as GearSlot];
          continue;
        }

        if (!item || !item.id) {
          finalGearSlots[slot] = null;
          continue;
        }

        // Skip if item doesn't exist in allItems
        if (!(item.id in itemsStore.allGearItems)) {
          finalGearSlots[slot] = null;
          continue;
        }

        const quality = useQuality ? item.quality ?? null : null;
        const resolvedQuality = quality || this.determineQuality(item.id);

        // Check if this item is already equipped with the same quality
        const currentItem = this.selectedGearset[slot as GearSlot];
        if (currentItem?.id === item.id && currentItem.quality === resolvedQuality) {
          finalGearSlots[slot] = currentItem;
          continue;
        }

        // Check if we have this item in cache
        const cachedItem = this._getFromCache(item.id, resolvedQuality);
        if (cachedItem) {
          finalGearSlots[slot] = cachedItem;
        } else {
          itemsToFetch.push({ slot, id: item.id, quality: resolvedQuality });
        }
      }

      // Batch fetch all items that need to be fetched
      if (itemsToFetch.length > 0) {
        const uniqueRequests = itemsToFetch.filter(
          (item, index, self) =>
            index === self.findIndex((i) => i.id === item.id && i.quality === item.quality)
        );

        const notificationStore = useNotificationStore();
        void notificationStore.debug(
          `Gear: fetching ${uniqueRequests.length} item(s) for batch equip` +
          (uniqueRequests.length < 5
            ? ` - ${uniqueRequests.map((r) => r.id).join(", ")}`
            : ` - ${uniqueRequests.slice(0, 4).map((r) => r.id).join(", ")} +${uniqueRequests.length - 4} more`),
        );

        const fetchedItems = await this._fetchMultipleItems(uniqueRequests);
        const fetchedItemsMap = new Map<string, EquippedItem>();

        fetchedItems.forEach(({ id, quality, data }) => {
          if (data) {
            fetchedItemsMap.set(this._getCacheKey(id, quality), data);
          }
        });

        itemsToFetch.forEach(({ slot, id, quality }) => {
          const cacheKey = this._getCacheKey(id, quality);
          finalGearSlots[slot] = fetchedItemsMap.get(cacheKey) ?? null;
        });
      }

      return finalGearSlots;
    },

    toggleSlotLock(slot: GearSlot): void {
      const locked = this.lockedSlots[this.gearSetIndex];
      if (!locked) return;
      const idx = locked.indexOf(slot);
      if (idx === -1) {
        locked.push(slot);
      } else {
        locked.splice(idx, 1);
      }
    },

    // Method to clear the item cache if needed
    clearItemCache(): void {
      this.itemCache.clear();
    },

    // Method to remove specific items from cache
    removeFromCache(id: string, quality: string | null = null): void {
      if (quality) {
        const cacheKey = this._getCacheKey(id, quality);
        this.itemCache.delete(cacheKey);
      } else {
        // Remove all qualities of this item
        const keysToDelete: string[] = [];
        for (const key of this.itemCache.keys()) {
          if (key.startsWith(`${id}_`)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => this.itemCache.delete(key));
      }
    },

    // Command execution and history management
    async _executeCommand(command: Command): Promise<void> {
      await executeCommand(command, "gear");
    },

    async initializeHistoryTracking(): Promise<boolean> {
      return initializeHistoryTracking("gear");
    },
  },
});
