import { activityNone } from "@/domain/constants/activityNone.ts";

export class SetActivityCommand {
  constructor(
    activityStore,
    newActivity,
    previousActivity = null,
    previousRecipe = null,
    previousLocation = null,
    previousLocations = null
  ) {
    this.activityStore = activityStore;
    this.newActivity = newActivity;
    this.previousActivity = previousActivity;
    this.previousRecipe = previousRecipe;
    this.previousLocation = previousLocation;
    this.previousLocations = previousLocations;
    this.description = newActivity
      ? `Select activity: ${newActivity.name}`
      : `Clear activity`;
  }

  async execute() {
    // Don't record history during execute/undo
    this.activityStore._setActivityDirect(this.newActivity);

    // Load activity locations if we have an activity
    if (
      this.newActivity &&
      this.newActivity.id !== "none" &&
      this.newActivity.id !== "travelling"
    ) {
      await this.activityStore.loadActivityLocations(this.newActivity.id);
    } else {
      this.activityStore._setLocationsDirect(null);
      this.activityStore._setLocationDirect(null);
    }
  }

  async undo() {
    // Don't record history during execute/undo
    // Set undo flag and restore state in one batch to minimize reactivity
    if (this.previousActivity) {
      this.activityStore._batchUpdateActivityState({
        _isUndoRedoOperation: true,
        activity: this.previousActivity,
        locations: this.previousLocations,
        location: this.previousLocation,
      });
    } else if (this.previousRecipe) {
      this.activityStore._batchUpdateActivityState({
        _isUndoRedoOperation: true,
        activity: activityNone,
        recipe: this.previousRecipe,
        locations: this.previousLocations,
        location: this.previousLocation,
      });
    }

    // Clear the undo flag after a microtask
    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}

export class SetRecipeCommand {
  constructor(
    activityStore,
    newRecipe,
    previousActivity = null,
    previousRecipe = null,
    previousLocation = null,
    previousLocations = null,
    previousService = null,
    previousServices = null
  ) {
    this.activityStore = activityStore;
    this.newRecipe = newRecipe;
    this.previousActivity = previousActivity;
    this.previousRecipe = previousRecipe;
    this.previousLocation = previousLocation;
    this.previousLocations = previousLocations;
    this.previousService = previousService;
    this.previousServices = previousServices;
    this.description = newRecipe
      ? `Select recipe: ${newRecipe.name}`
      : `Clear recipe`;
  }

  async execute() {
    // Don't record history during execute/undo
    this.activityStore._setRecipeDirect(this.newRecipe);

    // Load recipe services if we have a recipe
    if (this.newRecipe && this.newRecipe.id !== "none") {
      const [skill] = this.newRecipe.relatedSkills || [null];
      const recipeRequirement = this.newRecipe.requirements
        .filter(({ type }) => type === "service")
        .map(({ requirement }) => requirement);
      await this.activityStore.loadRecipeServices(skill, recipeRequirement);
    } else {
      this.activityStore._setServicesDirect([]);
      this.activityStore._setServiceDirect(null);
      this.activityStore._setLocationsDirect(null);
      this.activityStore._setLocationDirect(null);
    }
  }

  async undo() {
    // Don't record history during execute/undo
    // Set undo flag and restore state in one batch to minimize reactivity

    if (this.previousRecipe) {
      this.activityStore._batchUpdateActivityState({
        _isUndoRedoOperation: true,
        recipe: this.previousRecipe,
        services: this.previousServices,
        service: this.previousService,
        locations: this.previousLocations,
        location: this.previousLocation,
      });
    } else if (this.previousActivity) {
      this.activityStore._batchUpdateActivityState({
        _isUndoRedoOperation: true,
        activity: this.previousActivity,
        recipe: activityNone,
        locations: this.previousLocations,
        location: this.previousLocation,
      });
    }

    // Clear the undo flag after a microtask
    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}

export class SetLocationCommand {
  constructor(activityStore, newLocation, previousLocation = null) {
    this.activityStore = activityStore;
    this.newLocation = newLocation;
    this.previousLocation = previousLocation;
    this.description = newLocation
      ? `Select location: ${newLocation.name}`
      : `Clear location`;
  }

  async execute() {
    // Don't record history during execute/undo
    this.activityStore._setLocationDirect(this.newLocation);
  }

  async undo() {
    // Don't record history during execute/undo
    // Set undo flag and restore state in one batch
    this.activityStore._batchUpdateActivityState({
      _isUndoRedoOperation: true,
      location: this.previousLocation,
    });

    // Clear the undo flag after a microtask
    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}

export class SetServiceCommand {
  constructor(
    activityStore,
    newService,
    previousService = null,
    previousLocation = null,
    previousLocations = null
  ) {
    this.activityStore = activityStore;
    this.newService = newService;
    this.previousService = previousService;
    this.previousLocation = previousLocation;
    this.previousLocations = previousLocations;
    this.description = newService
      ? `Select service: ${newService.name}`
      : `Clear service`;
  }

  async execute() {
    // Don't record history during execute/undo
    this.activityStore._setServiceDirect(this.newService);

    // Load service locations if we have a service
    if (this.newService) {
      await this.activityStore.loadServiceLocations(this.newService.id);
    } else {
      this.activityStore._setLocationsDirect(null);
      this.activityStore._setLocationDirect(null);
    }
  }

  async undo() {
    // Don't record history during execute/undo
    // Set undo flag and restore state in one batch to minimize reactivity
    this.activityStore._batchUpdateActivityState({
      _isUndoRedoOperation: true,
      service: this.previousService,
      locations: this.previousLocations,
      location: this.previousLocation,
    });

    // Clear the undo flag after a microtask
    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}
