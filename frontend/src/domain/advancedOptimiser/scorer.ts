/**
 * Purpose:
 * Scores a whole gear set for the advanced optimiser: requirement checks,
 * stat totals, skill modifiers, target extraction, normalisation against the
 * naked-gear baseline of the set's location, and combination.
 *
 * Only whole sets are scored. Set bonuses, work-efficiency caps and
 * location-only stats depend on the rest of the set, so item values are never
 * added up separately.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or access stores.
 * - Decide which sets to try (see `beam.ts`).
 */

import { calculateStatTotals, type EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import { calculateSkillModifiers } from "@/domain/skillModifiers";
import {
  buildDynCtx,
  preFilterStaticEntries,
  requirementsMet,
} from "@/domain/optimiser/setRequirements";
import type { LocationSummary } from "@/domain/types/location";
import type { StaticReqCtx, WorkerGearSet, WorkerItem } from "@/workers/optimiserWorkerTypes";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import { COMBINATION_STRATEGIES } from "./combination";
import {
  computeBaseline,
  normalise,
  shareOfBest,
  targetKey,
  type Baseline,
} from "./normalisation";
import { extracted, type ExtractionContext } from "./targets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SetScore = {
  /** False when the set misses a gear requirement of the activity. */
  valid: boolean;
  /**
   * Combined normalised score. Computed for invalid sets too, so partial sets
   * that don't yet hold a required item can still be ranked.
   */
  score: number;
  /** Raw extracted value per target key ("x/y"). */
  values: Record<string, number>;
  /**
   * Value relative to naked gear at the set's location per target key
   * (1.3 = 30% better); `null` when the target has no baseline.
   */
  ratios: Record<string, number | null>;
  /**
   * Share of the best value each target reaches on its own (0 = naked,
   * 1 = best), when the scorer was given best values; otherwise empty.
   */
  shares: Record<string, number | null>;
};

export type SetScorer = (set: WorkerGearSet) => SetScore;

type LocationCache = {
  reqCtx: StaticReqCtx;
  staticEntries: EffectiveAttrEntry[];
  baseline: Baseline;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isWorkerItem = (value: unknown): value is WorkerItem =>
  value != null && typeof value === "object" && "_attrEntries" in value;

/** The equipped items of a set (location excluded). */
export const setItems = (set: WorkerGearSet): WorkerItem[] =>
  Object.entries(set)
    .filter(([slot]) => slot !== "location")
    .map(([, value]) => value)
    .filter(isWorkerItem);

/** The static requirement context with `location` as the current location. */
const reqCtxAt = (reqCtx: StaticReqCtx, location: LocationSummary | null): StaticReqCtx =>
  location
    ? {
        ...reqCtx,
        locationKeywords: location.keywords ?? [],
        locationFaction: location.faction ?? null,
        locationSubFactions: location.subFactions ?? [],
      }
    : reqCtx;

/** Seed gear set holding the locked items. Every candidate starts from it. */
export const applyLocks = (lockedItems: Record<string, WorkerItem>): WorkerGearSet => ({
  ...lockedItems,
});

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------

/**
 * @param bestValues Best value per target key, each target optimised alone.
 *                   When given, targets are scored by their share of it
 *                   (`shareOfBest`) instead of their ratio to naked gear.
 */
export const createSetScorer = (
  job: AdvancedOptimiserJob,
  bestValues?: Record<string, number>,
): SetScorer => {
  const combine = COMBINATION_STRATEGIES[job.combinationRule];
  const cache = new Map<string, LocationCache>();

  const modifiersFor = (entries: EffectiveAttrEntry[]) =>
    calculateSkillModifiers(calculateStatTotals(entries), job.source, job.activitySelected);

  const extractionCtx = (entries: EffectiveAttrEntry[]): ExtractionContext => ({
    ...job.extraction,
    modifiers: modifiersFor(entries),
  });

  /** Static entries and naked baseline for a location, computed once. */
  const atLocation = (location: LocationSummary | null): LocationCache => {
    const key = location?.id ?? "";
    let entry = cache.get(key);
    if (!entry) {
      const reqCtx = reqCtxAt(job.reqCtx, location);
      const staticEntries = preFilterStaticEntries(job.staticEntries, reqCtx);
      const baseline = computeBaseline(job.targets, extractionCtx(staticEntries));
      entry = { reqCtx, staticEntries, baseline };
      cache.set(key, entry);
    }
    return entry;
  };

  return (set) => {
    const location = (set.location as LocationSummary | null | undefined) ?? job.defaultLocation;
    const { reqCtx, staticEntries, baseline } = atLocation(location);

    const items = setItems(set);
    const dynCtx = buildDynCtx(items, location, reqCtx);
    const valid = requirementsMet(job.activityRequirements, reqCtx, dynCtx);

    const gearEntries = items.flatMap((item) =>
      item._attrEntries.filter((e) => requirementsMet(e.requirements, reqCtx, dynCtx)),
    );
    const ctx = extractionCtx([...staticEntries, ...gearEntries]);

    const values: Record<string, number> = {};
    const ratios: Record<string, number | null> = {};
    const shares: Record<string, number | null> = {};
    const scored = job.targets.map((target) => {
      const key = targetKey(target);
      values[key] ??= extracted(target.x, target.y, ctx);
      ratios[key] = normalise(baseline, target, values[key]);
      if (!bestValues) return { target, normalised: ratios[key] };

      const base = baseline.get(key);
      const best = bestValues[key];
      shares[key] =
        base === undefined || best === undefined ? null : shareOfBest(base, best, values[key]);
      return { target, normalised: shares[key] };
    });

    return { valid, score: combine(scored), values, ratios, shares };
  };
};

/** Sort comparator: valid sets first, then higher score. */
export const compareSetScores = (a: SetScore, b: SetScore): number =>
  Number(b.valid) - Number(a.valid) || b.score - a.score;
