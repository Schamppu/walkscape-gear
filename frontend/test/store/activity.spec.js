import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupActivityStore } from "../helpers/storeSetup";
import { mockActivities } from "../data/activities";
import { mockRecipes } from "../data/recipes";
import { activityNone } from "../../src/constants/activityNone";

// Helper to get a valid activity and recipe
const validActivity = mockActivities[0];
const validRecipe = mockRecipes[0];

describe("ActivityStore", () => {
  let store;

  beforeEach(async () => {
    store = await setupActivityStore();
  });

  it("sets up with mock data", async () => {
    const store = await setupActivityStore();

    expect(store.activities).toEqual(mockActivities);
    expect(store.recipes).toEqual(mockRecipes);
    expect(store.isLoaded).toBe(true);
  });

  describe("activity selection", () => {
    it("activitySelected returns true when activity is set", () => {
      store._setActivityDirect(validActivity);
      expect(store.activitySelected).toBe(true);
    });

    it("activitySelected returns false when activity is 'none'", () => {
      store._setActivityDirect(activityNone);
      expect(store.activitySelected).toBe(false);
    });

    it("should set recipe to none when activity is selected", () => {
      store._setRecipeDirect(validRecipe);
      expect(store.recipe).toEqual(expect.objectContaining(validRecipe));

      store._setActivityDirect(validActivity);
      expect(store.activity).toEqual(expect.objectContaining(validActivity));
      expect(store.recipeSelected).toBe(false);
      expect(store.recipe).toEqual(activityNone);
    });

    it("should reset services and service when activity is set", () => {
      store.services = [{ id: "service1" }, { id: "service2" }];
      store.service = { id: "service1" };

      store._setActivityDirect(validActivity);
      expect(store.services).toHaveLength(0);
      expect(store.service).toBeNull();
    });
  });

  describe("recipe selection", () => {
    it("recipeSelected returns true when recipe is set", async () => {
      store._setRecipeDirect(validRecipe);
      expect(store.recipeSelected).toBe(true);
    });

    it("recipeSelected returns false when recipe is 'none'", () => {
      store._setRecipeDirect(activityNone);
      expect(store.recipeSelected).toBe(false);
    });

    it("should set activity to none when recipe is selected", () => {
      store._setActivityDirect(validActivity);
      expect(store.activity).toEqual(expect.objectContaining(validActivity));

      store._setRecipeDirect(validRecipe);
      expect(store.recipe).toEqual(expect.objectContaining(validRecipe));
      expect(store.activitySelected).toBe(false);
      expect(store.activity).toEqual(activityNone);
    });
  });

  it("fetchActivitiesData does not overwrite if already loaded", async () => {
    const originalActivities = [...store.activities];
    await store.fetchActivitiesData();
    expect(store.activities).toEqual(originalActivities);
  });

  it("activitiesMap is correctly populated", async () => {
    mockActivities.forEach((activity) => {
      expect(store.activitiesMap[activity.id]).toEqual({
        name: activity.name,
        icon: activity.icon,
      });
    });
  });

  describe("indirect setters call _executeCommand", () => {
    describe("setActivity", () => {
      it("should pass correct props without previous activity", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        store.setActivity(validActivity);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetActivityCommand, but class is not exported

        expect(commandArg.newActivity).toMatchObject({
          id: validActivity.id,
          name: validActivity.name,
          value: validActivity.name,
        });
        expect(commandArg.previousActivity).toBeNull();
        expect(commandArg.previousRecipe).toBeNull();
        expect(commandArg.previousLocation).toBeNull();
        expect(commandArg.previousLocations).toBeNull();
      });

      it("should pass correct props with previous activity", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        const testActivity = mockActivities[1];
        store._setActivityDirect(testActivity); // Set previous activity
        store.setActivity(validActivity);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetActivityCommand, but class is not exported

        expect(commandArg.newActivity).toMatchObject({
          id: validActivity.id,
          name: validActivity.name,
          value: validActivity.name,
        });
        expect(commandArg.previousActivity).toMatchObject({
          id: testActivity.id,
          name: testActivity.name,
        });
        expect(commandArg.previousRecipe).toBeNull();
        expect(commandArg.previousLocation).toBeNull();
        expect(commandArg.previousLocations).toBeNull();
      });

      it("should pass correct props with previous recipe", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        store._setRecipeDirect(validRecipe);
        store.setActivity(validActivity);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetActivityCommand, but class is not exported
        expect(commandArg.newActivity).toMatchObject({
          id: validActivity.id,
          name: validActivity.name,
          value: validActivity.name,
        });
        expect(commandArg.previousActivity).toBeNull();
        expect(commandArg.previousRecipe).toMatchObject({
          id: validRecipe.id,
          name: validRecipe.name,
        });
      });
    });

    describe("setRecipe", () => {
      it("should pass correct props without previous recipe", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        store.setRecipe(validRecipe);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetRecipeCommand, but class is not exported
        expect(commandArg.newRecipe).toMatchObject({
          id: validRecipe.id,
          name: validRecipe.name,
          value: validRecipe.name,
        });
        expect(commandArg.previousRecipe).toBeNull();
      });

      it("should pass correct props with previous recipe", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        const testRecipe = mockRecipes[1];
        store._setRecipeDirect(testRecipe);
        store.setRecipe(validRecipe);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetRecipeCommand, but class is not exported
        expect(commandArg.newRecipe).toMatchObject({
          id: validRecipe.id,
          name: validRecipe.name,
          value: validRecipe.name,
        });
        expect(commandArg.previousRecipe).toMatchObject({
          id: testRecipe.id,
          name: testRecipe.name,
        });
      });

      it("should pass correct props with previous activity", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        store._setActivityDirect(validActivity);
        store.setRecipe(validRecipe);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object);
        expect(commandArg.newRecipe).toMatchObject({
          id: validRecipe.id,
          name: validRecipe.name,
          value: validRecipe.name,
        });
        expect(commandArg.previousActivity).toMatchObject({
          id: validActivity.id,
          name: validActivity.name,
        });
      });
    });

    describe("setLocation", () => {
      it("should pass correct props without previous location", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        const testLocation = { id: "loc1", name: "Location 1" };
        store.setLocation(testLocation);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetLocationCommand, but class is not exported
        expect(commandArg.newLocation).toMatchObject({
          id: "loc1",
          name: "Location 1",
        });
        expect(commandArg.previousLocation).toBeNull();
      });

      it("should pass correct props with previous location", () => {
        const spy = vi.spyOn(store, "_executeCommand");
        const previousLocation = { id: "loc1", name: "Location 1" };
        const newLocation = { id: "loc2", name: "Location 2" };
        store._setLocationDirect(previousLocation);
        store.setLocation(newLocation);
        expect(spy).toHaveBeenCalled();
        const commandArg = spy.mock.calls[0][0];
        expect(commandArg).toBeInstanceOf(Object); // Should be SetLocationCommand, but class is not exported
        expect(commandArg.newLocation).toMatchObject({
          id: "loc2",
          name: "Location 2",
        });
        expect(commandArg.previousLocation).toMatchObject({
          id: "loc1",
          name: "Location 1",
        });
      });
    });

    // it("setRecipe calls _executeCommand with correct props", async () => {
    //   const store = await setupActivityStore();
    //   const spy = spyOn(store, "_executeCommand");
    //   const recipe = { id: "recipe1", name: "Recipe 1" };
    //   store.setRecipe(recipe);
    //   expect(spy).toHaveBeenCalled();
    //   const commandArg = spy.mock.calls[0][0];
    //   expect(commandArg.recipe).toMatchObject({
    //     id: "recipe1",
    //     name: "Recipe 1",
    //     value: "Recipe 1",
    //   });
    // });

    // it("setLocation calls _executeCommand with correct props", async () => {
    //   const store = await setupActivityStore();
    //   const spy = spyOn(store, "_executeCommand");
    //   const location = { id: "loc1", name: "Location 1" };
    //   store.setLocation(location);
    //   expect(spy).toHaveBeenCalled();
    //   const commandArg = spy.mock.calls[0][0];
    //   expect(commandArg.location).toMatchObject({
    //     id: "loc1",
    //     name: "Location 1",
    //   });
    // });

    // it("setService calls _executeCommand with correct props", async () => {
    //   const store = await setupActivityStore();
    //   const spy = spyOn(store, "_executeCommand");
    //   const service = { id: "svc1", name: "Service 1" };
    //   await store.setService(service);
    //   expect(spy).toHaveBeenCalled();
    //   const commandArg = spy.mock.calls[0][0];
    //   expect(commandArg.service).toMatchObject({ id: "svc1", name: "Service 1" });
    // });
  });
});
