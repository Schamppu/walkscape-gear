/**
 * Purpose:
 * Shared types for the command pattern used by the history store.
 *
 * Responsibilities:
 * - Define the Command interface that all command classes must implement
 * - Define minimal store interfaces needed by commands (duck-typed to avoid
 *   circular imports with the JS stores)
 *
 * Does NOT:
 * - Import Vue or reactive utilities
 * - Import concrete store implementations
 */

import type { ActivityDetail } from "@/domain/types/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { LocationDetail, LocationSummary } from "@/domain/types/location";
import type { ServiceSummary } from "@/domain/types/service";

// ---------------------------------------------------------------------------
// Core command interface
// ---------------------------------------------------------------------------

export interface Command {
  /** Human-readable label shown in undo/redo UI. */
  readonly description: string;
  /** Timestamp (ms) assigned by the history store when the command is recorded. */
  timestamp?: number;
  execute(): Promise<void>;
  undo(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Minimal store interfaces (duck-typed - concrete stores are still JS)
// ---------------------------------------------------------------------------

/** Shape of an activity state batch update payload. */
export interface ActivityStateUpdate {
  _isUndoRedoOperation?: boolean;
  activity?: ActivityDetail | null;
  recipe?: RecipeDetail | null;
  location?: LocationSummary | null;
  locations?: LocationSummary[] | null;
  service?: ServiceSummary | null;
  services?: ServiceSummary[] | null;
}

/** Minimal interface for activity store methods used by activity commands. */
export interface IActivityStore {
  _isUndoRedoOperation: boolean;
  _setActivityDirect(activity: ActivityDetail | null): void;
  _setRecipeDirect(recipe: RecipeDetail | null): void;
  _setLocationDirect(location: LocationSummary | null): void;
  _setLocationsDirect(locations: LocationSummary[] | null): void;
  _setServiceDirect(service: ServiceSummary | null): void;
  _setServicesDirect(services: ServiceSummary[]): void;
  _batchUpdateActivityState(updates: ActivityStateUpdate): void;
  loadActivityLocations(id: string): Promise<void>;
  loadRecipeServices(skill: string | null, requirements: Record<string, unknown>[]): Promise<void>;
  loadServiceLocations(id: string): Promise<LocationDetail[]>;
}

/** Loose type for a gear slot map (slot name → item data). */
export type GearSlots = Record<string, unknown>;

/** Loose type for a raw gear set mapping as stored in the DB. */
export type GearSetMapping = Record<string, unknown>;

/** Minimal interface for gear store methods used by gear commands. */
export interface IGearStore {
  _setGearSlotDirect(slot: string, item: unknown): void;
  _setAllGearSlotsDirect(slots: GearSlots): void;
  _equipMultipleDirect(gearSetData: GearSlots): Promise<void>;
  _processGearSetData(gearSetData: GearSetMapping, useQuality?: boolean): Promise<GearSlots>;
  _batchUpdateGearState(gearSlots: GearSlots): Promise<void>;
  isSlotLocked(slot: string): boolean;
}

/** Minimal interface for gear set store methods used by gear commands. */
export interface IGearSetStore {
  _setCurrentSetDirect(gearSetData: Record<string, unknown>): void;
  _createNewSetDirect(): void;
}
