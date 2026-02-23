import { activityNone } from "@/domain/constants/activityNone";
import type { ActivityDetail } from "@/domain/types/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { LocationSummary } from "@/domain/types/location";
import type { ServiceSummary } from "@/domain/types/service";
import type { Command, IActivityStore } from "./types";

// ---------------------------------------------------------------------------
// SetActivityCommand
// ---------------------------------------------------------------------------

export class SetActivityCommand implements Command {
  readonly description: string;
  timestamp?: number;

  constructor(
    private readonly activityStore: IActivityStore,
    private readonly newActivity: ActivityDetail | null,
    private readonly previousActivity: ActivityDetail | null = null,
    private readonly previousRecipe: RecipeDetail | null = null,
    private readonly previousLocation: LocationSummary | null = null,
    private readonly previousLocations: LocationSummary[] | null = null,
  ) {
    this.description = newActivity
      ? `Select activity: ${newActivity.name}`
      : "Clear activity";
  }

  async execute(): Promise<void> {
    this.activityStore._setActivityDirect(this.newActivity);

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

  async undo(): Promise<void> {
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
        activity: activityNone as unknown as ActivityDetail,
        recipe: this.previousRecipe,
        locations: this.previousLocations,
        location: this.previousLocation,
      });
    }

    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}

// ---------------------------------------------------------------------------
// SetRecipeCommand
// ---------------------------------------------------------------------------

export class SetRecipeCommand implements Command {
  readonly description: string;
  timestamp?: number;

  constructor(
    private readonly activityStore: IActivityStore,
    private readonly newRecipe: RecipeDetail | null,
    private readonly previousActivity: ActivityDetail | null = null,
    private readonly previousRecipe: RecipeDetail | null = null,
    private readonly previousLocation: LocationSummary | null = null,
    private readonly previousLocations: LocationSummary[] | null = null,
    private readonly previousService: ServiceSummary | null = null,
    private readonly previousServices: ServiceSummary[] | null = null,
  ) {
    this.description = newRecipe
      ? `Select recipe: ${newRecipe.name}`
      : "Clear recipe";
  }

  async execute(): Promise<void> {
    this.activityStore._setRecipeDirect(this.newRecipe);

    if (this.newRecipe && this.newRecipe.id !== "none") {
      const [skill = null] = this.newRecipe.relatedSkills ?? [];
      const recipeRequirement = (this.newRecipe.requirements ?? [])
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

  async undo(): Promise<void> {
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
        recipe: activityNone as unknown as RecipeDetail,
        locations: this.previousLocations,
        location: this.previousLocation,
      });
    }

    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}

// ---------------------------------------------------------------------------
// SetLocationCommand
// ---------------------------------------------------------------------------

export class SetLocationCommand implements Command {
  readonly description: string;
  timestamp?: number;

  constructor(
    private readonly activityStore: IActivityStore,
    private readonly newLocation: LocationSummary | null,
    private readonly previousLocation: LocationSummary | null = null,
  ) {
    this.description = newLocation
      ? `Select location: ${newLocation.name}`
      : "Clear location";
  }

  async execute(): Promise<void> {
    this.activityStore._setLocationDirect(this.newLocation);
  }

  async undo(): Promise<void> {
    this.activityStore._batchUpdateActivityState({
      _isUndoRedoOperation: true,
      location: this.previousLocation,
    });

    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}

// ---------------------------------------------------------------------------
// SetServiceCommand
// ---------------------------------------------------------------------------

export class SetServiceCommand implements Command {
  readonly description: string;
  timestamp?: number;

  constructor(
    private readonly activityStore: IActivityStore,
    private readonly newService: ServiceSummary | null,
    private readonly previousService: ServiceSummary | null = null,
    private readonly previousLocation: LocationSummary | null = null,
    private readonly previousLocations: LocationSummary[] | null = null,
  ) {
    this.description = newService
      ? `Select service: ${newService.name}`
      : "Clear service";
  }

  async execute(): Promise<void> {
    this.activityStore._setServiceDirect(this.newService);

    if (this.newService) {
      await this.activityStore.loadServiceLocations(this.newService.id);
    } else {
      this.activityStore._setLocationsDirect(null);
      this.activityStore._setLocationDirect(null);
    }
  }

  async undo(): Promise<void> {
    this.activityStore._batchUpdateActivityState({
      _isUndoRedoOperation: true,
      service: this.previousService,
      locations: this.previousLocations,
      location: this.previousLocation,
    });

    setTimeout(() => {
      this.activityStore._isUndoRedoOperation = false;
    }, 0);
  }
}
