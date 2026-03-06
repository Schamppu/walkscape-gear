import { defineStore } from "pinia";
import {
  getActivity,
  getRecipe,
  searchLocations,
  getRealmDefaultLocations,
  searchServices,
  getActivities,
  getRecipes,
} from "@/utils/axios/api_routes";
import {
  filterServices,
  sortServicesByTier,
  type ServiceRequirement,
} from "@/domain/services/services";
import { activityNone, type ActivityNone } from "@/domain/constants/activityNone";
import {
  SetActivityCommand,
  SetRecipeCommand,
  SetServiceCommand,
  SetLocationCommand,
} from "./commands/activityCommands";
import type { ActivityStateUpdate, Command } from "./commands/types";
import type { ActivityDetail, ActivitySummary } from "@/domain/types/activity";
import type { RecipeDetail, RecipeSummary } from "@/domain/types/recipe";
import type { ServiceDetail } from "@/domain/types/service";
import type { Requirement } from "@/domain/types/common";
import type { LocationDetail } from "@/domain/types/location";
import { useNotificationStore } from "@/store/notifications";
import { executeCommand, initializeHistoryTracking } from "@/store/utils/historyUtils";

/**
 * Activity Store
 * Manages the state of activities, recipes, services, and locations.
 * Integrates with a command pattern for undo/redo functionality.
 * Handles loading of related data and ensures consistent state updates.
 * Designed to be resilient to the presence or absence of the history store.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityMapEntry = Pick<ActivitySummary, "name" | "icon">;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useActivityStore = defineStore("activityStore", {
  state: () => ({
    activities: [] as ActivitySummary[],
    activitiesMap: {} as Record<string, ActivityMapEntry>,
    embargoedActivities: new Set<string>(),
    activity: null as ActivityDetail | ActivityNone | null,
    recipes: [] as RecipeSummary[],
    recipe: null as RecipeDetail | ActivityNone | null,
    location: null as LocationDetail | null,
    locations: null as LocationDetail[] | null,
    services: null as ServiceDetail[] | null,
    service: null as ServiceDetail | null,
    useFineMaterials: false,
    useFineInputs: false,
    isLoaded: false,
    _isUndoRedoOperation: false, // Flag to prevent auto-selection during undo/redo
  }),
  getters: {
    activitySelected: (state): boolean => {
      return state.activity !== null && state.activity.id !== "none";
    },
    recipeSelected: (state): boolean => {
      return state.recipe !== null && state.recipe.id !== "none";
    },
  },
  actions: {
    async fetchActivitiesData(): Promise<void> {
      if (this.isLoaded) return;

      const [{ data: activities }, { data: recipes }] = await Promise.all([
        getActivities(),
        getRecipes(),
      ]);

      this.activities = activities;
      this.activitiesMap = Object.fromEntries(
        activities.map(({ id, name, icon }) => [id, { name, icon }]),
      );
      this.embargoedActivities = new Set(
        activities.filter((item) => "embargo" in item).map(({ id }) => id),
      );
      this.recipes = recipes;

      this.isLoaded = true;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `Activity: loaded ${activities.length} activities (${this.embargoedActivities.size} embargoed), ${recipes.length} recipes`,
      );
    },

    setActivity(activity: ActivityDetail): void {
      const previousActivity =
        this.activity?.id !== "none" ? (this.activity as ActivityDetail) : null;
      const previousRecipe =
        this.recipe?.id !== "none" ? (this.recipe as RecipeDetail) : null;
      const previousLocation = this.location;
      const previousLocations = this.locations;

      // Create and execute command
      const command = new SetActivityCommand(
        this,
        activity,
        previousActivity,
        previousRecipe,
        previousLocation,
        previousLocations,
      );
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setActivityDirect(activity: ActivityDetail | null): void {
      this.recipe = activityNone;
      this.services = [];
      this.service = null;
      this.activity = activity;
    },

    setRecipe(recipe: RecipeDetail | ActivityNone): void {
      const previousActivity =
        this.activity?.id !== "none" ? (this.activity as ActivityDetail) : null;
      const previousRecipe =
        this.recipe?.id !== "none" ? (this.recipe as RecipeDetail) : null;
      const previousLocation = this.location;
      const previousLocations = this.locations;
      const previousService = this.service;
      const previousServices = this.services;


      // ActivityNone is the sentinel for "no recipe selected"; the command treats null the same way.
      const recipeForCommand: RecipeDetail | null =
        recipe.id === "none" ? null : (recipe as RecipeDetail);

      // Create and execute command
      const command = new SetRecipeCommand(
        this,
        recipeForCommand,
        previousActivity,
        previousRecipe,
        previousLocation,
        previousLocations,
        previousService,
        previousServices,
      );
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setRecipeDirect(recipe: RecipeDetail | null): void {
      this.activity = activityNone;
      this.recipe = recipe;
    },

    setLocations(locations: LocationDetail[] | null): void {
      this.locations = locations;
    },

    setLocation(location: LocationDetail | null): void {
      const current = this.location;
      if ((current?.id ?? null) === (location?.id ?? null)) return;

      const previousLocation = this.location;

      // Create and execute command
      const command = new SetLocationCommand(this, location, previousLocation);
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setLocationDirect(location: LocationDetail | null): void {
      this.location = location;
    },

    // Direct setter for locations (used by commands)
    _setLocationsDirect(locations: LocationDetail[] | null): void {
      this.locations = locations;
    },

    async setService(service: ServiceDetail | null): Promise<void> {
      const previousService = this.service;
      const previousLocation = this.location;
      const previousLocations = this.locations;

      // Create and execute command
      const command = new SetServiceCommand(
        this,
        service,
        previousService,
        previousLocation,
        previousLocations,
      );
      this._executeCommand(command);
    },

    // Direct setter that doesn't record history (used by commands)
    _setServiceDirect(service: ServiceDetail | null): void {
      this.service = service;
    },

    // Direct setters for services (used by commands)
    _setServicesDirect(services: ServiceDetail[]): void {
      this.services = services;
    },

    // Batch update method to minimize reactivity triggers
    _batchUpdateActivityState(updates: ActivityStateUpdate): void {
      // Apply all updates in one go to minimize reactive updates
      const newState = { ...this.$state };

      if ("activity" in updates) newState.activity = updates.activity ?? null;
      if ("recipe" in updates) newState.recipe = updates.recipe ?? null;
      if ("service" in updates) newState.service = updates.service as ServiceDetail | null ?? null;
      if ("services" in updates) newState.services = updates.services as ServiceDetail[] | null ?? null;
      if ("location" in updates) newState.location = updates.location as LocationDetail | null ?? null;
      if ("locations" in updates) newState.locations = updates.locations as LocationDetail[] | null ?? null;
      if ("_isUndoRedoOperation" in updates)
        newState._isUndoRedoOperation = updates._isUndoRedoOperation ?? false;

      // Apply all changes at once
      Object.assign(this.$state, newState);
    },

    async loadActivity(id: string): Promise<void> {
      const { data: activity } = await getActivity({ id });
      this.setActivity(activity as unknown as ActivityDetail);
    },
    async loadActivityLocations(id: string, skipAutoSelect = false): Promise<void> {
      const { data: locations } = await searchLocations(
        { activityList: id } as { activityList: string; serviceList: string },
      );
      this.setLocations(locations);
      if (locations.length && !skipAutoSelect && !this._isUndoRedoOperation)
        this._setLocationDirect(locations[0]);
    },
    async loadRecipe(id: string): Promise<void> {
      if (id === "none") {
        this.setRecipe(activityNone);
        return;
      }
      const { data: recipe } = await getRecipe({ id });
      const recipeDetail = recipe as unknown as RecipeDetail;
      this.setRecipe(recipeDetail);

      const [skill = null] = recipeDetail.relatedSkills ?? [];

      const serviceRequirements = recipeDetail.requirements
        .filter(({ type }: Requirement) => type === "service")
        .map(({ requirement }: Requirement) => requirement);
      await this.loadRecipeServices(skill, serviceRequirements);
    },
    async loadRecipeServices(
      skill: string | null,
      serviceRequirements: Record<string, unknown>[],
    ): Promise<void> {
      if (!skill || !serviceRequirements) {
        this.services = [];
        this.service = null;
        this._setLocationsDirect(null);
        this._setLocationDirect(null);
        return;
      }

      const { data: services } = await searchServices({ skill });

      let filteredServices: ServiceDetail[];
      if (serviceRequirements && serviceRequirements.length) {
        filteredServices = filterServices(
          services as unknown as ServiceDetail[],
          serviceRequirements[0] as ServiceRequirement,
        );
      } else {
        filteredServices = [];
      }

      this.services = filteredServices.sort(sortServicesByTier);

      if (filteredServices.length) {
        await this._setServiceDirect(filteredServices[0]);
        // Load locations for the auto-selected service
        await this.loadServiceLocations(filteredServices[0].id);
      } else {
        this._setServiceDirect(null);
        await this.loadServiceLocations(null, false, true);
      }
    },
    async loadServiceLocations(
      id: string | null,
      skipAutoSelect = false,
      noService = false,
    ): Promise<LocationDetail[]> {
      const { data: locations } = !noService
        ? await searchLocations(
            { serviceList: id } as { activityList: string; serviceList: string },
          )
        : await getRealmDefaultLocations();
      this.setLocations(locations);
      if (locations.length && !skipAutoSelect && !this._isUndoRedoOperation)
        this._setLocationDirect(locations[0]);
      return locations;
    },

    // Command execution and history management
    async _executeCommand(command: { execute(): Promise<void> } & object): Promise<void> {
      await executeCommand(command as Command, "activity");
    },

    async initializeHistoryTracking(): Promise<boolean> {
      return initializeHistoryTracking("activity");
    },
  },
});
