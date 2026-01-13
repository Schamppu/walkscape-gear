import { defineStore } from "pinia";
import { useNotificationStore } from "@/store/notifications";
import {
  getGearSetTags,
  getGearSets,
  getGearSet,
  upsertGearSet,
  deleteGearSet,
} from "@/utils/axios/db_routes";
import { LoadGearSetCommand } from "./gearCommands";
import { createEmptyGearSetSelection } from "@/utils/createEmptyGearSet";

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

export const useGearSetStore = defineStore("gearSetStore", {
  state: () => ({
    gearSets: [],
    gearSetTags: [],
    isLoaded: false,
    sets: [createEmptyGearSetSelection(), createEmptyGearSetSelection()],
    gearSetIndex: 0,
  }),

  getters: {
    // Get the current set as a reactive object
    currentSet(state) {
      return state.sets[this.gearSetIndex];
    },

    // Check if current set has unsaved changes
    hasUnsavedChanges() {
      return this.currentSet.isDirty;
    },

    // Check if current set is valid for saving
    canSave() {
      return this.currentSet.name.trim().length > 0;
    },

    // Check if current set is valid for saving with gear data
    canSaveWithGear() {
      return (hasGearEquipped) =>
        this.currentSet.name.trim().length > 0 && hasGearEquipped;
    },

    // Get selected set ID (for dropdown binding)
    selectedSetId() {
      return this.currentSet.id;
    },
  },

  actions: {
    async fetchGearSets() {
      if (this.isLoaded) return;

      const [gearSetTags, gearSets] = await Promise.all([
        getGearSetTags(),
        getGearSets(),
      ]);

      this.gearSetTags = gearSetTags;

      const mappedGearSets = gearSets.map((gearSet) => {
        return {
          ...gearSet,
          tags: gearSet.tags.map((tagId) =>
            this.gearSetTags.find(({ id }) => tagId === id)
          ),
        };
      });
      this.gearSets = mappedGearSets;

      this.isLoaded = true;
    },

    // Direct setter that doesn't record history (used by commands)
    _setCurrentSetDirect(gearSetData) {
      if (gearSetData) {
        this.sets[this.gearSetIndex] = {
          id: gearSetData.id,
          name: gearSetData.name,
          tags: [...(gearSetData.tags || [])],
          items: [...(gearSetData.items || [])],
          isDirty: false,
          isNew: false,
        };
      } else {
        this._createNewSetDirect();
      }
    },

    // Direct method to create new set without history (used by commands)
    _createNewSetDirect() {
      this.sets[this.gearSetIndex] = createEmptyGearSetSelection();
    },

    // Create a new empty set
    createNewSet() {
      this.sets[this.gearSetIndex] = createEmptyGearSetSelection();

      // Clear gear set parameter from URL when creating new set
      this._updateUrlWithGearSet(null);
    },

    // Create a new set with command pattern support for undo
    async createNewSetWithHistory() {
      const { useGearStore } = await import("./gear");
      const gearStore = useGearStore();

      // Capture current state for undo
      const previousGearSetId = this.selectedSetId;
      const previousGearSetData = this.selectedSetId
        ? { ...this.currentSet }
        : null;
      const previousGearSlots = { ...gearStore.selectedGearset };

      // Create command to clear gear set
      const command = new LoadGearSetCommand(
        gearStore,
        this,
        null, // setId
        null, // gearSetData (will create new set)
        {}, // gearSetMapping (empty)
        previousGearSetId,
        previousGearSetData,
        previousGearSlots
      );

      await this._executeCommand(command);

      // Clear gear set parameter from URL
      await this._updateUrlWithGearSet(null);
    },

    // Helper method to update URL (avoiding circular import issues)
    async _updateUrlWithGearSet(gearSetId) {
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
    async loadSet(setId) {
      const existingSet = this.gearSets.find((set) => set.id === setId);
      if (!existingSet) {
        this.createNewSet();
        return false;
      }

      let returnValue = true;
      // If the existing set doesn't have items (from the lightweight getGearSets call),
      // fetch the full gear set data including items
      let oldSet = true;
      let fullGearSet = existingSet;
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
          notificationStore.error(
            `Error loading gear set: ${existingSet.name}`
          );
          fullGearSet = existingSet;
          returnValue = false;
        }
      }

      this.sets[this.gearSetIndex] = {
        id: fullGearSet.id,
        name: fullGearSet.name,
        tags: [
          ...(oldSet
            ? fullGearSet.tags
            : fullGearSet.tags.map((tagId) =>
                this.gearSetTags.find(({ id }) => tagId === id)
              ) || []),
        ],
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
        // Capture current state for undo
        const previousGearSetId = this.currentSet.id;
        const previousGearSetData = this.currentSet.id
          ? { ...this.currentSet }
          : null;
        const previousGearSlots = { ...gearStore.selectedGearset };

        // Load the gear set data (this part stays the same for fetching)
        await this.loadSet(setId);

        // Process the gear data
        const gearSet = Object.fromEntries(
          this.currentSet.items.map(
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

        Object.keys(gearStore.selectedGearset).forEach((key) => {
          if (
            !(
              ["service", "consumable", "potion"].includes(key) ||
              key in gearSet
            )
          ) {
            gearSet[key] = null; // Ensure all slots are set, even if empty
          }
        });

        // Create and execute the load gear set command
        // Pass the raw gear set mapping, the command will process it
        const command = new LoadGearSetCommand(
          gearStore,
          this,
          setId,
          { ...this.currentSet }, // Current gear set data (already loaded)
          gearSet, // Raw gear set mapping (will be processed in command)
          previousGearSetId,
          previousGearSetData,
          previousGearSlots
        );

        // Execute the command (this will set the gear set state and equip gear)
        await this._executeCommand(command);

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
        tags: this.currentSet.tags.map((tag) => tag.id),
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
          const newSet = { ...payload, id: newId, tags: this.currentSet.tags };
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
            this.gearSets[index] = { ...payload, tags: this.currentSet.tags };
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
