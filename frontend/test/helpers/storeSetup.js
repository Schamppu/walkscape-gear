import { setActivePinia, createPinia } from "pinia";
import { useActivityStore } from "@/store/activity";
import { vi } from "vitest";
import { mockActivities as defaultActivities } from "../data/activities";
import { mockRecipes as defaultRecipes } from "../data/recipes";
import { mockLocations as defaultLocations } from "../data/locations";

// Default mock data, can be overridden in tests
export let mockActivities = defaultActivities;
export let mockRecipes = defaultRecipes;
export let mockLocations = defaultLocations;

// Mock the API module at the top-level
vi.mock("@/utils/axios/api_routes", () => ({
  getActivities: vi.fn(() => Promise.resolve({ data: mockActivities })),
  getRecipes: vi.fn(() => Promise.resolve({ data: mockRecipes })),
  searchLocations: vi.fn(() => Promise.resolve({ data: mockLocations })),
  searchServices: vi.fn(() => Promise.resolve({ data: [] })),
}));

export async function setupStore(useStore, setupFn, mockData) {
  setActivePinia(createPinia());
  const store = useStore();

  if (setupFn) {
    await setupFn.call(store, mockData);
  } else {
    Object.assign(store, mockData);
  }

  return store;
}

export async function setupActivityStore({
  activities = mockActivities,
  recipes = mockRecipes,
} = {}) {
  // Override mock data for this test run
  mockActivities = activities;
  mockRecipes = recipes;

  return setupStore(useActivityStore, async function () {
    await this.fetchActivitiesData();
  });
}
