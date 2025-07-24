import { defineStore } from "pinia";
import { useNotificationStore } from "@/store/notifications";
import {
  getGearSetTags,
  getGearSets,
  getGearSet,
  upsertGearSet,
  deleteGearSet,
} from "@/utils/axios/db_routes";

export const useGearSetStore = defineStore("gearSetStore", {
  state: () => ({
    gearSets: [],
    gearSetTags: [],
    isLoaded: false,
    currentSet: {
      id: null,
      name: "",
      tags: [],
      items: [],
      isDirty: false,
      isNew: true,
    },
  }),

  getters: {
    // Get the current set as a reactive object
    getCurrentSet: (state) => state.currentSet,

    // Check if current set has unsaved changes
    hasUnsavedChanges: (state) => state.currentSet.isDirty,

    // Check if current set is valid for saving
    canSave: (state) => {
      return state.currentSet.name.trim().length > 0;
    },

    // Check if current set is valid for saving with gear data
    canSaveWithGear: (state) => (hasGearEquipped) => {
      return state.currentSet.name.trim().length > 0 && hasGearEquipped;
    },

    // Get selected set ID (for dropdown binding)
    selectedSetId: (state) => state.currentSet.id,
  },

  actions: {
    async fetchGearSets() {
      if (this.isLoaded) return;

      const [gearSetTags, gearSets] = await Promise.all([
        getGearSetTags(),
        getGearSets(),
      ]);

      this.gearSetTags = gearSetTags;
      this.gearSets = gearSets;

      this.isLoaded = true;
    },

    // Create a new empty set
    createNewSet() {
      this.currentSet = {
        id: null,
        name: "",
        tags: [],
        items: [],
        isDirty: false,
        isNew: true,
      };

      // Clear gear set parameter from URL when creating new set
      this._updateUrlWithGearSet(null);
    },

    // Helper method to update URL (avoiding circular import issues)
    async _updateUrlWithGearSet(gearSetId) {
      try {
        const { useUrlStore } = await import("./url");
        const urlStore = useUrlStore();
        if (gearSetId) {
          urlStore.encodeAndPushToUrl();
        }
        urlStore.updateUrlWithGearSet(gearSetId);
      } catch (error) {
        console.warn("Could not update URL:", error);
      }
    },

    // Load an existing set for editing
    async loadSet(setId) {
      const existingSet = this.gearSets.find((set) => set.id === setId);
      if (!existingSet) {
        this.createNewSet();
        return false;
      }

      let returnValue = true;
      // If the existing set doesn't have items (from the lightweight getGearSets call),
      // fetch the full gear set data including items
      let fullGearSet = existingSet;
      if (
        !existingSet.items ||
        !Array.isArray(existingSet.items) ||
        existingSet.items.length === 0
      ) {
        try {
          fullGearSet = await getGearSet(setId);
        } catch (error) {
          console.error(error);
          const notificationStore = useNotificationStore();
          notificationStore.error(
            `Error loading gear set: ${existingSet.name}`
          );
          fullGearSet = existingSet;
          returnValue = false;
        }
      }

      this.currentSet = {
        id: fullGearSet.id,
        name: fullGearSet.name,
        tags: [...(fullGearSet.tags || [])],
        items: [...(fullGearSet.items || [])],
        isDirty: false,
        isNew: false,
      };

      return returnValue;
    },

    async selectAndEquipSet(setId) {
      const { useGearStore } = await import("./gear");
      const gearStore = useGearStore();

      try {
        await this.loadSet(setId);

        const gearSet = Object.fromEntries(
          this.getCurrentSet.items.map(
            ({ itemId, quality, slotIndex, slotType }) => {
              const slotName = ["ring", "tool"].includes(slotType)
                ? `${slotType}${slotIndex + 1}`
                : slotType;
              return [
                slotName,
                {
                  id: itemId,
                  quality: quality || null,
                },
              ];
            }
          )
        );

        Object.keys(gearStore.gearSlots).forEach((key) => {
          if (
            !(
              ["service", "consumable", "potion"].includes(key) ||
              key in gearSet
            )
          ) {
            gearSet[key] = null; // Ensure all slots are set, even if empty
          }
        });

        await gearStore.equipMultiple(gearSet);

        // Update URL with gear set parameter
        await this._updateUrlWithGearSet(setId);

        const notificationStore = useNotificationStore();
        notificationStore.success(
          `"${this.currentSet.name}" loaded successfully`
        );

        return true;
      } catch (error) {
        console.error("Failed to select and equip gear set:", error);
        return false;
      }
    },

    // Update current set name
    updateCurrentSetName(name) {
      if (this.currentSet.name !== name) {
        this.currentSet.name = name;
        this.currentSet.isDirty = true;
      }
    },

    // Update current set tags
    updateCurrentSetTags(tags) {
      this.currentSet.tags = [...tags];
      this.currentSet.isDirty = true;
    },

    // Update current set items (from gear store)
    updateCurrentSetItems(items) {
      this.currentSet.items = [...items];
      this.currentSet.isDirty = true;
    },

    // Save current set to backend and update local store
    async saveCurrentSet(gearItems = null) {
      // If gear items are provided, update them first
      if (gearItems) {
        this.updateCurrentSetItems(gearItems);
      }

      if (!this.canSave) {
        const notificationStore = useNotificationStore();
        notificationStore.error("Cannot save: set name is required");
        return;
      }

      if (!this.currentSet.items || this.currentSet.items.length === 0) {
        const notificationStore = useNotificationStore();
        notificationStore.error("Cannot save: no gear items to save");
        return;
      }

      const payload = {
        id: this.currentSet.id,
        name: this.currentSet.name,
        tags: this.currentSet.tags,
        items: this.currentSet.items,
      };

      try {
        // Save to backend
        const result = await upsertGearSet(payload);

        // Update local state
        if (this.currentSet.isNew) {
          const newId = result.gearSetId;

          if (!newId) {
            throw new Error(
              "Failed to save gear set: No ID returned from server"
            );
          }

          // Add new set to the list
          const newSet = { ...payload, id: newId };
          this.gearSets.push(newSet);
          this.currentSet.id = newId;
          this.currentSet.isNew = false;

          const notificationStore = useNotificationStore();
          notificationStore.success(`"${newSet.name}" created successfully`);

          // Update URL with new gear set parameter
          await this._updateUrlWithGearSet(newId);
        } else {
          // Update existing set in the list
          const index = this.gearSets.findIndex(
            (set) => set.id === this.currentSet.id
          );
          if (index !== -1) {
            this.gearSets[index] = { ...payload };
          }

          const notificationStore = useNotificationStore();
          notificationStore.success(
            `"${this.currentSet.name}" updated successfully`
          );

          // Update URL with updated gear set parameter
          await this._updateUrlWithGearSet(this.currentSet.id);
        }

        this.currentSet.isDirty = false;
        return this.currentSet.id;
      } catch {
        const notificationStore = useNotificationStore();
        notificationStore.error("Failed to save gear set");
      }
    },

    // Reset current set to last saved state
    async resetCurrentSet() {
      if (this.currentSet.isNew) {
        this.createNewSet();
      } else {
        await this.loadSet(this.currentSet.id);
      }
    },

    async addGearSet({ id, name, tags, items }) {
      if (!name || !items) {
        throw new Error("Name, and items are required to create a gear set.");
      }

      const payload = {
        id,
        name,
        tags,
        items,
      };
      await upsertGearSet(payload);
    },

    async deleteGearSet(id) {
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

        // Show success notification
        const notificationStore = useNotificationStore();
        notificationStore.success(`"${gearSetName}" deleted successfully`);
      } catch (error) {
        // Show error notification
        const notificationStore = useNotificationStore();
        notificationStore.error("Failed to delete gear set");
        throw error;
      }
    },
  },
});
