import { defineStore } from "pinia";
import {
  getActivity,
  getRecipe,
  searchLocations,
  searchServices,
  getActivities,
  getRecipes,
} from "@/utils/axios/api_routes";
import { filterServicesByTier, sortServicesByTier } from "@/utils/services";
import { activityNone } from "@/utils/activityNone";

export const useActivityStore = defineStore("activityStore", {
  state: () => ({
    activities: [],
    activitiesMap: {},
    activity: null,
    recipes: [],
    recipe: null,
    location: null,
    locations: null,
    services: null,
    service: null,
    showCombined: true,
    hideOwnedCollectibles: true,
    isLoaded: false,
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
      this.recipes = recipes;

      this.isLoaded = true;
    },

    setActivity(activity) {
      this.recipe = activityNone;
      this.services = [];
      this.service = null;
      this.activity = { ...activity, value: activity.name };
    },
    setRecipe(recipe) {
      this.activity = activityNone;
      this.recipe = { ...recipe, value: recipe.name };
    },

    setLocations(locations) {
      this.locations = locations;
    },
    setLocation(location) {
      this.location = location;
    },
    async setService(service) {
      this.service = service;
      await this.loadServiceLocations(service.id);
    },
    async loadActivity(id) {
      const { data: activity } = await getActivity({ id });
      this.setActivity(activity);
    },
    async loadActivityLocations(id) {
      const { data: locations } = await searchLocations({ activityList: id });
      this.setLocations(locations);
      if (locations.length) this.setLocation(locations[0]);
    },
    async loadRecipe(id) {
      if (id === "none") {
        this.setRecipe(activityNone);
        return;
      }
      const { data: recipe } = await getRecipe({ id });
      this.setRecipe(recipe);

      const [skill] = recipe.relatedSkills || [null];
      const recipeRequirement = recipe.requirements
        .map(({ requirement }) => requirement)
        .find((req) => req.runtimeType === "service");
      await this.loadRecipeServices(skill, recipeRequirement);
    },
    async loadRecipeServices(skill, recipeRequirement) {
      if (!skill) {
        this.services = [];
        this.service = null;
        return;
      }

      const { data: services } = await searchServices({ skill });

      let filteredServices = services;
      if (recipeRequirement) {
        filteredServices = filterServicesByTier(
          services,
          recipeRequirement.tier
        );
      }

      this.services = filteredServices.sort(sortServicesByTier);
      if (filteredServices.length) {
        this.service = filteredServices[0];
        await this.loadServiceLocations(this.service.id);
      }
    },
    async loadServiceLocations(id) {
      const { data: locations } = await searchLocations({ serviceList: id });
      this.setLocations(locations);
      if (locations.length) this.setLocation(locations[0]);
    },
  },
});
