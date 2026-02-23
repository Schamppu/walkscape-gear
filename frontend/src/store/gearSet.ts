import { defineStore } from "pinia";
import { useNotificationStore } from "@/store/notifications";
import {
  getGearSetTags,
  getGearSets,
  getGearSet,
  upsertGearSet,
  deleteGearSet,
} from "@/utils/axios/db_routes";
import { LoadGearSetCommand } from "./commands/gearCommands";
import { createEmptyGearSetSelection } from "@/domain/gear/gearSet";
import type { Command } from "./commands/types";
import type {
  DbTag,
  DbGearSet,
  DbGearSetDetail,
  DbGearSetItem,
  UpsertGearSetPayload,
} from "@/domain/types/db";
import { executeCommand, initializeHistoryTracking } from "@/store/utils/historyUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** DbGearSet with tags resolved from string IDs to full DbTag objects. */
export type MappedGearSet = Omit<DbGearSet, "tags"> & {
  tags: (DbTag | undefined)[];
  items?: GearSetItemSlot[];
};

/** A gear set item payload slot — what the DB returns and what we save. */
export type GearSetItemSlot = Pick<DbGearSetItem, "slotType" | "slotIndex" | "itemId" | "quality">;

/** The current set selection tracked in the store with resolved tags and items. */
export type TypedGearSetSelection = {
  id: number | null;
  name: string;
  tags: DbTag[];
  items: GearSetItemSlot[];
  isDirty: boolean;
  isNew: boolean;
};

/** Raw gear slot mapping used when equipping a set: slotName → { id, quality }. */
export type GearSlotMapping = Record<string, { id: string; quality: string | null } | null>;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGearSetStore = defineStore("gearSetStore", {
  state: () => ({
    gearSets: [] as MappedGearSet[],
    gearSetTags: [] as DbTag[],
    isLoaded: false,
    sets: [
      createEmptyGearSetSelection() as TypedGearSetSelection,
      createEmptyGearSetSelection() as TypedGearSetSelection,
    ],
    gearSetIndex: 0,
  }),

  getters: {
    currentSet(state): TypedGearSetSelection {
      return state.sets[this.gearSetIndex];
    },

    hasUnsavedChanges(): boolean {
      return this.currentSet.isDirty;
    },

    canSave(): boolean {
      return this.currentSet.name.trim().length > 0;
    },

    canSaveWithGear(): (hasGearEquipped: boolean) => boolean {
      return (hasGearEquipped: boolean) =>
        this.currentSet.name.trim().length > 0 && hasGearEquipped;
    },

    selectedSetId(): number | null {
      return this.currentSet.id;
    },
  },

  actions: {
    async fetchGearSets(): Promise<void> {
      if (this.isLoaded) return;

      const [gearSetTags, gearSets] = await Promise.all([
        getGearSetTags(),
        getGearSets(),
      ]);

      this.gearSetTags = gearSetTags;

      const mappedGearSets: MappedGearSet[] = gearSets.map((gearSet) => ({
        ...gearSet,
        tags: gearSet.tags.map((tagId) =>
          this.gearSetTags.find(({ id }) => tagId === id)
        ),
      }));
      this.gearSets = mappedGearSets;

      this.isLoaded = true;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `GearSet: loaded ${this.gearSets.length} gear sets, ${this.gearSetTags.length} tags`,
      );
    },

    // Direct setter that doesn't record history (used by commands)
    _setCurrentSetDirect(gearSetData: Record<string, unknown> | null): void {
      if (gearSetData) {
        this.sets[this.gearSetIndex] = {
          id: gearSetData.id as number,
          name: gearSetData.name as string,
          tags: [...((gearSetData.tags as DbTag[]) || [])],
          items: [...((gearSetData.items as GearSetItemSlot[]) || [])],
          isDirty: false,
          isNew: false,
        };
      } else {
        this._createNewSetDirect();
      }
    },

    // Direct method to create new set without history (used by commands)
    _createNewSetDirect(): void {
      this.sets[this.gearSetIndex] = createEmptyGearSetSelection() as TypedGearSetSelection;
    },

    // Create a new empty set
    createNewSet(): void {
      this.sets[this.gearSetIndex] = createEmptyGearSetSelection() as TypedGearSetSelection;

      // Clear gear set parameter from URL when creating new set
      this._updateUrlWithGearSet(null);
    },

    // Create a new set with command pattern support for undo
    async createNewSetWithHistory(): Promise<void> {
      const { useGearStore } = await import("./gear");
      const gearStore = useGearStore();

      const previousGearSetId = this.selectedSetId;
      const previousGearSetData = this.selectedSetId
        ? ({ ...this.currentSet } as Record<string, unknown>)
        : null;
      const previousGearSlots = { ...gearStore.selectedGearset };

      const command = new LoadGearSetCommand(
        gearStore,
        this,
        null, // setId — null means create new set
        null, // gearSetData
        {}, // gearSetMapping (empty)
        previousGearSetId as unknown as string | null,
        previousGearSetData,
        previousGearSlots,
      );

      await this._executeCommand(command);
      await this._updateUrlWithGearSet(null);
    },

    // Helper method to update URL (avoiding circular import issues)
    async _updateUrlWithGearSet(gearSetId: number | null): Promise<void> {
      try {
        const { useUrlStore } = await import("./url");
        const urlStore = useUrlStore();
        if (gearSetId && this.gearSetIndex === 0) {
          urlStore.encodeAndPushToUrl();
        }
        urlStore.updateUrlWithGearSet(gearSetId, this.gearSetIndex);
      } catch (error) {
        console.warn("Could not update URL:", error);
      }
    },

    // Load an existing set for editing
    async loadSet(setId: number): Promise<boolean> {
      const existingSet = this.gearSets.find((set) => set.id === setId);
      if (!existingSet) {
        this.createNewSet();
        return false;
      }

      let returnValue = true;
      let oldSet = true;
      let fullGearSet: MappedGearSet | DbGearSetDetail = existingSet;

      if (
        !existingSet.items ||
        !Array.isArray(existingSet.items) ||
        existingSet.items.length === 0
      ) {
        try {
          fullGearSet = await getGearSet(setId);
          oldSet = false;
        } catch (error) {
          console.error(error);
          const notificationStore = useNotificationStore();
          void notificationStore.error(`Error loading gear set: ${existingSet.name}`);
          fullGearSet = existingSet;
          returnValue = false;
        }
      }

      const resolvedTags: (DbTag | undefined)[] = oldSet
        ? (fullGearSet as MappedGearSet).tags
        : (fullGearSet as DbGearSetDetail).tags.map((tagId) =>
            this.gearSetTags.find(({ id }) => tagId === id)
          );

      this.sets[this.gearSetIndex] = {
        id: fullGearSet.id,
        name: fullGearSet.name,
        tags: [...(resolvedTags.filter((t): t is DbTag => t !== undefined))],
        items: [...((fullGearSet.items as GearSetItemSlot[] | undefined) || [])],
        isDirty: false,
        isNew: false,
      };

      return returnValue;
    },

    async selectAndEquipSet(setId: number): Promise<boolean> {
      const { useGearStore } = await import("./gear");
      const gearStore = useGearStore();

      try {
        const previousGearSetId = this.currentSet.id;
        const previousGearSetData = this.currentSet.id
          ? ({ ...this.currentSet } as Record<string, unknown>)
          : null;
        const previousGearSlots = { ...gearStore.selectedGearset };

        await this.loadSet(setId);

        const gearSet: GearSlotMapping = Object.fromEntries(
          this.currentSet.items.map(({ itemId, quality, slotIndex, slotType }) => {
            const slotName = ["ring", "tool"].includes(slotType)
              ? `${slotType}${slotIndex + 1}`
              : slotType;
            return [slotName, { id: itemId, quality: quality || null }];
          })
        );

        Object.keys(gearStore.selectedGearset).forEach((key) => {
          if (!(["service", "consumable", "potion"].includes(key) || key in gearSet)) {
            gearSet[key] = null;
          }
        });

        const command = new LoadGearSetCommand(
          gearStore,
          this,
          setId as unknown as string,
          { ...this.currentSet } as Record<string, unknown>,
          gearSet,
          previousGearSetId as unknown as string | null,
          previousGearSetData,
          previousGearSlots,
        );

        await this._executeCommand(command);
        await this._updateUrlWithGearSet(setId);

        const notificationStore = useNotificationStore();
        void notificationStore.success(`"${this.currentSet.name}" loaded successfully`);

        return true;
      } catch (error) {
        console.error("Failed to select and equip gear set:", error);
        return false;
      }
    },

    updateCurrentSetName(name: string): void {
      if (this.currentSet.name !== name) {
        this.currentSet.name = name;
        this.currentSet.isDirty = true;
      }
    },

    updateCurrentSetTags(tags: DbTag[]): void {
      this.currentSet.tags = [...tags];
      this.currentSet.isDirty = true;
    },

    updateCurrentSetItems(items: GearSetItemSlot[]): void {
      this.currentSet.items = [...items];
      this.currentSet.isDirty = true;
    },

    async saveCurrentSet(gearItems: GearSetItemSlot[] | null = null): Promise<number | undefined> {
      if (gearItems) {
        this.updateCurrentSetItems(gearItems);
      }

      if (!this.canSave) {
        const notificationStore = useNotificationStore();
        void notificationStore.error("Cannot save: set name is required");
        return;
      }

      if (!this.currentSet.items || this.currentSet.items.length === 0) {
        const notificationStore = useNotificationStore();
        void notificationStore.error("Cannot save: no gear items to save");
        return;
      }

      const payload: UpsertGearSetPayload = {
        id: this.currentSet.id ?? undefined,
        name: this.currentSet.name,
        tags: this.currentSet.tags.map((tag) => tag.id),
        items: this.currentSet.items,
      };

      try {
        const result = await upsertGearSet(payload);

        if (this.currentSet.isNew) {
          const newId = result.gearSetId;

          if (!newId) {
            throw new Error("Failed to save gear set: No ID returned from server");
          }

          const newSet: MappedGearSet = {
            ...payload,
            id: newId,
            userUuid: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false,
            sortOrder: null,
            tags: this.currentSet.tags,
          };
          this.gearSets.push(newSet);
          this.currentSet.id = newId;
          this.currentSet.isNew = false;

          const notificationStore = useNotificationStore();
          void notificationStore.success(`"${newSet.name}" created successfully`);
          await this._updateUrlWithGearSet(newId);
        } else {
          const index = this.gearSets.findIndex((set) => set.id === this.currentSet.id);
          if (index !== -1) {
            this.gearSets[index] = {
              ...this.gearSets[index],
              ...payload,
              tags: this.currentSet.tags,
            };
          }

          const notificationStore = useNotificationStore();
          void notificationStore.success(`"${this.currentSet.name}" updated successfully`);
          await this._updateUrlWithGearSet(this.currentSet.id);
        }

        this.currentSet.isDirty = false;
        return this.currentSet.id ?? undefined;
      } catch {
        const notificationStore = useNotificationStore();
        void notificationStore.error("Failed to save gear set");
      }
    },

    async resetCurrentSet(): Promise<void> {
      if (this.currentSet.isNew) {
        this.createNewSet();
      } else if (this.currentSet.id !== null) {
        await this.loadSet(this.currentSet.id);
      }
    },

    async addGearSet({
      id,
      name,
      tags,
      items,
    }: {
      id?: number;
      name: string;
      tags: string[];
      items: GearSetItemSlot[];
    }): Promise<void> {
      if (!name || !items) {
        throw new Error("Name, and items are required to create a gear set.");
      }

      const payload: UpsertGearSetPayload = { id, name, tags, items };
      await upsertGearSet(payload);
    },

    async deleteGearSet(id: number): Promise<void> {
      if (!id) {
        throw new Error("ID is required to delete a gear set.");
      }

      try {
        const gearSetToDelete = this.gearSets.find((set) => set.id === id);
        const gearSetName = gearSetToDelete?.name || "Gear Set";

        await deleteGearSet(id);
        this.gearSets = this.gearSets.filter((set) => set.id !== id);

        if (this.currentSet.id === id) {
          this.createNewSet();
        }

        const notificationStore = useNotificationStore();
        void notificationStore.success(`"${gearSetName}" deleted successfully`);
      } catch (error) {
        const notificationStore = useNotificationStore();
        void notificationStore.error("Failed to delete gear set");
        throw error;
      }
    },

    // Command execution and history management
    async _executeCommand(command: Command): Promise<void> {
      await executeCommand(command, "gear-set");
    },

    async initializeHistoryTracking(): Promise<boolean> {
      return initializeHistoryTracking("gear-set");
    },
  },
});
