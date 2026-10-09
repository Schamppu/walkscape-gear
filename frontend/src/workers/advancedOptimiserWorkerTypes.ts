/**
 * Purpose:
 * Serialisable types crossing the main-thread ↔ advanced-optimiser-worker
 * boundary.
 *
 * Everything here must survive `structuredClone` / `postMessage`: no Vue
 * reactive wrappers, Pinia stores or class instances.
 */

import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { SkillModifiersSource } from "@/domain/skillModifiers";
import type { HandledRequirement } from "@/domain/optimiser/requirements";
import type { LocationSummary } from "@/domain/types/location";
import type { CombinationRule, Target } from "@/domain/advancedOptimiser/config";
import type { ExtractionContext } from "@/domain/advancedOptimiser/targets";
import type {
  SearchProgress,
  SearchResult,
  SearchSettings,
} from "@/domain/advancedOptimiser/search";
import type { StaticReqCtx, WorkerGearSet, WorkerItem } from "./optimiserWorkerTypes";

export type AdvancedOptimiserJob = {
  // --- Objective ---
  targets: Target[];
  combinationRule: CombinationRule;

  // --- Scoring ---
  /** Collectibles, level bonuses and service. Filtered per location by the scorer. */
  staticEntries: EffectiveAttrEntry[];
  source: SkillModifiersSource;
  activitySelected: boolean;
  /** Everything extraction needs except the per-set modifiers. */
  extraction: Omit<ExtractionContext, "modifiers">;

  // --- Requirements ---
  reqCtx: StaticReqCtx;
  /** Gear-dependent requirements of the activity / recipe and service. */
  activityRequirements: HandledRequirement[];
  keywordsMap: Record<string, { bannedKeywords: string[] }>;

  // --- Search space ---
  /** Candidate items per slot key ("head", "ring", "tool", …). */
  options: Record<string, WorkerItem[]>;
  /** Locations to try. Empty means only `defaultLocation`. */
  locations: LocationSummary[];
  defaultLocation: LocationSummary | null;
  /** Slot names to fill ("head", "ring1", "tool3", …), locked slots excluded. */
  searchSlots: string[];
  /** Locked slot name → item. Part of every candidate set. */
  lockedItems: Record<string, WorkerItem>;
  /**
   * Partial sets that already meet the activity's gear requirements (from the
   * quick set's requirementsFill). Empty means start from the locked items.
   */
  requirementSeeds: WorkerGearSet[];
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type AdvancedOptimiserInbound =
  | { type: "start"; job: AdvancedOptimiserJob; settings?: Partial<SearchSettings> }
  | { type: "cancel" };

export type AdvancedOptimiserOutbound =
  | { type: "progress"; progress: SearchProgress }
  | { type: "result"; result: SearchResult }
  | { type: "error"; message: string };
