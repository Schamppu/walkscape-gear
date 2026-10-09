/**
 * Purpose:
 * Beam search over gear slots, producing good starting sets ("seeds") for
 * the advanced optimiser's local search.
 *
 * Slots are filled one at a time, keeping the best `width` partial sets after
 * each slot. Leaving a slot empty is always an option (the previous candidates
 * stay in the pool), so an item that hurts the score is never forced in.
 *
 * Does NOT:
 * - Import Vue / reactive APIs.
 * - Run under a time budget; it's bounded by slots × options × width.
 */

import { filterMultislot } from "@/domain/optimiser/setRequirements";
import type { LocationSummary } from "@/domain/types/location";
import type { WorkerGearSet, WorkerItem } from "@/workers/optimiserWorkerTypes";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import { applyLocks, compareSetScores, type SetScore, type SetScorer } from "./scorer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Candidate = {
  gearSet: WorkerGearSet;
  result: SetScore;
};

export type BeamOptions = {
  width: number;
  keywordsMap: Record<string, { bannedKeywords: string[] }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MULTI_SLOT_KEYS = new Set(["ring", "tool"]);

export const slotKeyOf = (slotName: string): string => slotName.replace(/\d+$/, "");

/** Identity of a gear set, for de-duplicating candidates. */
export const setSignature = (set: WorkerGearSet): string =>
  Object.entries(set)
    .filter(([, value]) => value)
    .map(([slot, value]) => {
      const { id, quality } = value as { id: string; quality?: string | null };
      return `${slot}=${id}:${quality ?? ""}`;
    })
    .sort()
    .join(",");

/** Best-first, without duplicate sets, at most `width` long. */
const keepBest = (candidates: Candidate[], width: number): Candidate[] => {
  const seen = new Set<string>();
  return [...candidates]
    .sort((a, b) => compareSetScores(a.result, b.result))
    .filter(({ gearSet }) => {
      const signature = setSignature(gearSet);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, width);
};

/**
 * Options for `slotName` given what the set already holds. For rings and
 * tools, `filterMultislot` drops duplicates and items banned by the other
 * slots' keywords; this also drops items whose own keywords ban an equipped
 * one, so a clash is caught whichever slot is filled first.
 */
export const slotOptions = (
  set: WorkerGearSet,
  slotName: string,
  options: Record<string, WorkerItem[]>,
  keywordsMap: BeamOptions["keywordsMap"],
): WorkerItem[] => {
  const slotKey = slotKeyOf(slotName);
  const items = options[slotKey] ?? [];
  if (!MULTI_SLOT_KEYS.has(slotKey)) return items;

  const otherKeywords = new Set(
    Object.entries(set)
      .filter(([slot, value]) => value && slot !== slotName && slotKeyOf(slot) === slotKey)
      .flatMap(([, value]) => (value as WorkerItem).keywords ?? []),
  );
  return filterMultislot(set, items, slotKey, slotName, keywordsMap).filter(
    (item) =>
      !(item.keywords ?? []).some((kw) =>
        (keywordsMap[kw]?.bannedKeywords ?? []).some((banned) => otherKeywords.has(banned)),
      ),
  );
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Fills the empty `slots` of `seed`, slots with the fewest options first.
 * Returns up to `width` best candidates.
 */
export const beamSearch = (
  seed: WorkerGearSet,
  slots: readonly string[],
  options: Record<string, WorkerItem[]>,
  score: SetScorer,
  { width, keywordsMap }: BeamOptions,
): Candidate[] => {
  const ordered = slots
    .filter((slot) => !seed[slot])
    .map((slot, index) => ({ slot, index, count: options[slotKeyOf(slot)]?.length ?? 0 }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => a.count - b.count || a.index - b.index)
    .map(({ slot }) => slot);

  let candidates: Candidate[] = [{ gearSet: seed, result: score(seed) }];

  for (const slot of ordered) {
    const next: Candidate[] = [];
    for (const { gearSet } of candidates) {
      for (const item of slotOptions(gearSet, slot, options, keywordsMap)) {
        const set = { ...gearSet, [slot]: item };
        next.push({ gearSet: set, result: score(set) });
      }
    }
    candidates = keepBest([...candidates, ...next], width);
  }

  return candidates;
};

/**
 * Starting sets for the local search: a beam search from every combination
 * of location and requirement seed, all holding the locked items.
 */
export const seedCandidates = (
  job: AdvancedOptimiserJob,
  score: SetScorer,
  width: number,
): Candidate[] => {
  const locations: (LocationSummary | null)[] = job.locations.length
    ? job.locations
    : [job.defaultLocation];
  const requirementSeeds = job.requirementSeeds.length ? job.requirementSeeds : [{}];
  const locked = applyLocks(job.lockedItems);

  const all = locations.flatMap((location) =>
    requirementSeeds.flatMap((requirementSeed) =>
      beamSearch(
        { ...requirementSeed, ...locked, location },
        job.searchSlots,
        job.options,
        score,
        { width, keywordsMap: job.keywordsMap },
      ),
    ),
  );

  return keepBest(all, width);
};
