/**
 * Purpose:
 * Shared serialisable types crossing the main-thread ↔ optimiser-worker boundary.
 *
 * All types here must be fully serialisable via `structuredClone` / `postMessage`.
 * No Vue reactive wrappers, Pinia stores or class instances.
 */

import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { OptimiserItem } from "@/domain/optimiser/types";
import type { LocationSummary } from "@/domain/types/location";

// ---------------------------------------------------------------------------
// Item enrichment
// ---------------------------------------------------------------------------

/**
 * OptimiserItem enriched with pre-computed `EffectiveAttrEntry[]` so the
 * worker scorer can skip `resolveItemAttrs` + `buildAllAttrEntries` per call.
 */
export type WorkerItem = OptimiserItem & {
  _attrEntries: EffectiveAttrEntry[];
};

export type WorkerGearSet = Record<string, WorkerItem | LocationSummary | null | undefined>;

export type WorkerCandidate = {
  gearSet: WorkerGearSet;
  score: number;
  slotCounts: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Requirement checking context
// ---------------------------------------------------------------------------

/**
 * Plain-object snapshot of everything `checkRequirements` needs that does
 * NOT vary per scoring call (i.e. does not depend on which items are currently
 * in the gear set being evaluated).
 */
export type StaticReqCtx = {
  activityId: string | null;
  activityKeywords: string[];
  /** relatedSkillsList for the activity, or relatedSkills for the recipe. */
  activityRelatedSkills: string[];
  recipeRelatedSkills: string[];
  /** true when an activity is selected; false for a recipe. */
  isActivity: boolean;

  /** Default location context derived from baseCtx.location. */
  locationKeywords: string[];
  locationFaction: string | null;
  locationSubFactions: string[];
  segments: Array<{ keywords: string[]; faction: string; subFactions?: string[] }>;

  selectedServiceTier: string | null;
  selectedServiceKeywords: string[];

  skillLevels: Record<string, number>;
  /** Only the `type` field is needed (for `mainSkillType` requirements). */
  skillsMap: Record<string, { type: string }>;
  achievementPoints: number;
  factionReputation: Record<string, number>;
  ownedItemIds: string[];
};
