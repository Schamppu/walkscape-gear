import { defineStore } from "pinia";
import {
  getGearSetTags,
  getGearSets,
  upsertGearSet,
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
      return (
        state.currentSet.name.trim().length > 0
      );
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

      // Initialize with a new set if none is loaded
      if (this.currentSet.id === null && this.currentSet.name === "") {
        this.createNewSet();
      }

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
    },

    // Load an existing set for editing
    loadSet(setId) {
      const existingSet = this.gearSets.find((set) => set.id === setId);
      if (!existingSet) {
        this.createNewSet();
        return;
      }

      this.currentSet = {
        id: existingSet.id,
        name: existingSet.name,
        tags: [...existingSet.tags], // clone arrays to avoid mutations
        items: [...existingSet.items],
        isDirty: false,
        isNew: false,
      };
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

    // Populate current set items from gear store
    captureCurrentGear() {
      // This will be called from components when they want to capture current gear
      // We'll pass the gear items as a parameter to avoid circular dependencies
    },

    // Save current set to backend and update local store
    async saveCurrentSet() {
      if (!this.canSave) {
        throw new Error("Cannot save: set name and items are required");
      }

      const payload = {
        id: this.currentSet.id,
        name: this.currentSet.name,
        tags: this.currentSet.tags,
        items: this.currentSet.items,
      };

      // Save to backend
      const result = await upsertGearSet(payload);

      // Update local state
      if (this.currentSet.isNew) {
        // Add new set to the list
        const newSet = { ...payload, id: result.id || payload.id };
        this.gearSets.push(newSet);
        this.currentSet.id = newSet.id;
        this.currentSet.isNew = false;
      } else {
        // Update existing set in the list
        const index = this.gearSets.findIndex(
          (set) => set.id === this.currentSet.id
        );
        if (index !== -1) {
          this.gearSets[index] = { ...payload };
        }
      }

      this.currentSet.isDirty = false;
      return this.currentSet.id;
    },

    // Reset current set to last saved state
    resetCurrentSet() {
      if (this.currentSet.isNew) {
        this.createNewSet();
      } else {
        this.loadSet(this.currentSet.id);
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
  },
});
