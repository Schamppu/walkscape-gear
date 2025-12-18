import { defineStore } from "pinia";
import {
  getActivity,
  getRecipe,
  searchLocations,
  searchServices,
  getActivities,
  getRecipes,
} from "@/utils/axios/api_routes";
import { filterServices, sortServicesByTier } from "@/utils/services";
import { activityNone } from "@/constants/activityNone";
import {
  SetActivityCommand,
  SetRecipeCommand,
  SetServiceCommand,
  SetLocationCommand,
} from "./activityCommands";

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

export const useActivityStore = defineStore("activityStore", {
  state: () => ({
    activities: [],
    activitiesMap: {},
    embargoedActivities: new Set(),
    activity: null,
    recipes: [],
    recipe: null,
    location: null,
    locations: null,
    services: null,
    service: null,
    isLoaded: false,
    _isUndoRedoOperation: false, // Flag to prevent auto-selection during undo/redo
  }),
  getters: {
    activitySelected: (state) => {
      return state.activity !== null && state.activity.id !== "none";
    },
    recipeSelected: (state) => {
      return state.recipe !== null && state.recipe.id !== "none";
    },
  },
  actions: {
    async fetchActivitiesData() {
      if (this.isLoaded) return;

      const [{ data: activities }, { data: recipes }] = await Promise.all([
        getActivities(),
        getRecipes(),
      ]);

      this.activities = activities;
      this.activitiesMap = Object.fromEntries(
        activities.map(({ id, name, icon }) => [id, { name, icon }])
      );
      this.embargoedActivities = new Set(
        activities.filter((item) => "embargo" in item).map(({ id }) => id)
      );
      this.recipes = recipes;

      this.isLoaded = true;
    },

    setActivity(activity) {
      const previousActivity =
        this.activity?.id !== "none" ? this.activity : null;
      const previousRecipe = this.recipe?.id !== "none" ? this.recipe : null;
      const previousLocation = this.location;
      const previousLocations = this.locations;

      // Create and execute command
      const command = new SetActivityCommand(
        this,
        { ...activity, value: activity.name },
        previousActivity,
        previousRecipe,
        previousLocation,
        previousLocations
      );
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setActivityDirect(activity) {
      this.recipe = activityNone;
      this.services = [];
      this.service = null;
      this.activity = activity;
    },

    setRecipe(recipe) {
      const previousActivity =
        this.activity?.id !== "none" ? this.activity : null;
      const previousRecipe = this.recipe?.id !== "none" ? this.recipe : null;
      const previousLocation = this.location;
      const previousLocations = this.locations;
      const previousService = this.service;
      const previousServices = this.services;

      // Create and execute command
      const command = new SetRecipeCommand(
        this,
        { ...recipe, value: recipe.name },
        previousActivity,
        previousRecipe,
        previousLocation,
        previousLocations,
        previousService,
        previousServices
      );
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setRecipeDirect(recipe) {
      this.activity = activityNone;
      this.recipe = recipe;
    },

    setLocations(locations) {
      this.locations = locations;
    },

    setLocation(location) {
      const previousLocation = this.location;

      // Create and execute command
      const command = new SetLocationCommand(this, location, previousLocation);
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setLocationDirect(location) {
      this.location = location;
    },

    // Direct setter for locations (used by commands)
    _setLocationsDirect(locations) {
      this.locations = locations;
    },

    async setService(service) {
      const previousService = this.service;
      const previousLocation = this.location;
      const previousLocations = this.locations;

      // Create and execute command
      const command = new SetServiceCommand(
        this,
        service,
        previousService,
        previousLocation,
        previousLocations
      );
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setServiceDirect(service) {
      this.service = service;
    },

    // Direct setters for services (used by commands)
    _setServicesDirect(services) {
      this.services = services;
    },

    // Batch update method to minimize reactivity triggers
    _batchUpdateActivityState(updates) {
      // Apply all updates in one go to minimize reactive updates
      const newState = { ...this.$state };

      if ("activity" in updates) newState.activity = updates.activity;
      if ("recipe" in updates) newState.recipe = updates.recipe;
      if ("service" in updates) newState.service = updates.service;
      if ("services" in updates) newState.services = updates.services;
      if ("location" in updates) newState.location = updates.location;
      if ("locations" in updates) newState.locations = updates.locations;
      if ("_isUndoRedoOperation" in updates)
        newState._isUndoRedoOperation = updates._isUndoRedoOperation;

      // Apply all changes at once
      Object.assign(this.$state, newState);
    },

    async loadActivity(id) {
      const { data: activity } = await getActivity({ id });
      this.setActivity(activity);
    },
    async loadActivityLocations(id, skipAutoSelect = false) {
      const { data: locations } = await searchLocations({ activityList: id });
      this.setLocations(locations);
      if (locations.length && !skipAutoSelect && !this._isUndoRedoOperation)
        this._setLocationDirect(locations[0]);
    },
    async loadRecipe(id) {
      if (id === "none") {
        this.setRecipe(activityNone);
        return;
      }
      const { data: recipe } = await getRecipe({ id });
      this.setRecipe(recipe);

      const [skill] = recipe.relatedSkills || [null];

      const serviceRequirements = recipe.requirements
        .filter(({ type }) => type === "service")
        .map(({ requirement }) => requirement);
      await this.loadRecipeServices(skill, serviceRequirements);
    },
    async loadRecipeServices(skill, serviceRequirements) {
      if (!skill) {
        this.services = [];
        this.service = null;
        this._setLocationsDirect(null);
        this._setLocationDirect(null);
        return;
      }

      const { data: services } = await searchServices({ skill });

      let filteredServices = services;
      if (serviceRequirements && serviceRequirements.length) {
        filteredServices = filterServices(services, serviceRequirements[0]);
      }

      this.services = filteredServices.sort(sortServicesByTier);
      if (filteredServices.length) {
        await this._setServiceDirect(filteredServices[0]);
        // Load locations for the auto-selected service
        await this.loadServiceLocations(filteredServices[0].id);
      } else {
        this._setServiceDirect(null);
        this._setLocationsDirect(null);
        this._setLocationDirect(null);
      }
    },
    async loadServiceLocations(id, skipAutoSelect = false) {
      const { data: locations } = await searchLocations({ serviceList: id });
      this.setLocations(locations);
      if (locations.length && !skipAutoSelect && !this._isUndoRedoOperation)
        this._setLocationDirect(locations[0]);
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
        console.error("Failed to execute activity command:", error);
      }
    },

    async initializeHistoryTracking() {
      try {
        const historyStore = await getHistoryStore();
        if (!historyStore) {
          console.debug("History store not available for activity");
          return false;
        }

        return true;
      } catch (error) {
        console.debug("Failed to initialize activity history tracking:", error);
        return false;
      }
    },
  },
});
