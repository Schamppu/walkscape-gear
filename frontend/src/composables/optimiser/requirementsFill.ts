/**
 * Purpose:
 * Builds partial gear sets that meet an activity's gear requirements
 * (required keywords, set counts, abilities). Shared by the quick set and the
 * advanced optimiser, which uses the results as search seeds.
 *
 * Scores candidates with `getGearSetStats`, so call it while a scorer is
 * installed (`installScorer`) for speed.
 *
 * Does NOT:
 * - Generate the item options (see `getRequiredGearOptions` in `./gear`).
 */

import { getItemOptions } from "@/composables/optimiser/gear";
import { getGearSetStats } from "@/composables/optimiser/stats";
import { startScore, compareScore } from "@/composables/optimiser/score";
import { getRequirementCandidates } from "@/composables/optimiser/requirements";
import {
  getReq,
  filterItemsForReq,
  contributesToReq,
  isHandledRequirement,
} from "@/domain/optimiser/requirements";
import type { Req } from "@/domain/optimiser/requirements";
import type { Requirement } from "@/domain/types/common";
import type {
  Candidate,
  FulfilledCandidate,
  GearOptions,
  GearSet,
  OptimiserItem,
} from "@/domain/optimiser/types";

const BEAM_WIDTH = 3;

function reqsBeamSearch(
  baseCandidate: Candidate,
  gearOptions: Record<string, OptimiserItem[]>,
  req: Req,
): FulfilledCandidate[] {
  const { gearSet, slotCounts } = baseCandidate;

  const startingFulfilled = Object.entries(gearSet).filter(([, item]) =>
    contributesToReq(item as OptimiserItem, req),
  ).length;

  let candidates: FulfilledCandidate[] = [
    {
      gearSet,
      score: startScore(),
      slotCounts,
      fulfilled: startingFulfilled,
    },
  ];

  const candidatesPool = getRequirementCandidates(gearOptions, req);

  for (const { slotName, slotKey, item } of candidatesPool) {
    const next: FulfilledCandidate[] = [];

    for (const { gearSet, fulfilled, slotCounts } of candidates) {
      if (gearSet[slotName]) continue;
      if (fulfilled >= req.quantity) continue;

      const newSet: GearSet = { ...gearSet, [slotName]: item };
      const newFulfilled = fulfilled + 1;
      const score = getGearSetStats(newSet);
      const prevCount = slotKey in slotCounts ? slotCounts[slotKey] : 0;
      const newSlotCount = { ...slotCounts, [slotName]: prevCount + 1 };

      next.push({
        gearSet: newSet,
        fulfilled: newFulfilled,
        score,
        slotCounts: newSlotCount,
      });
    }

    candidates = candidates
      .concat(next)
      .sort((a, b) => {
        if (a.fulfilled !== b.fulfilled) return b.fulfilled - a.fulfilled;
        const slotsA = Object.keys(a.gearSet).length;
        const slotsB = Object.keys(b.gearSet).length;
        if (slotsA !== slotsB) return slotsA - slotsB;
        return compareScore(b.score, a.score);
      })
      .slice(0, BEAM_WIDTH);
  }

  return candidates.filter((c) => c.fulfilled >= req.quantity);
}

/**
 * Returns up to three partial gear sets that meet every handled requirement
 * in `requirements` (activity / recipe plus service), using `gearOptions`'
 * required items. Returns the empty set when there's nothing to fulfil.
 */
export function requirementsFill(
  gearOptions: GearOptions,
  requirements: Requirement[],
): Candidate[] {
  const reqs = requirements.filter(isHandledRequirement);

  let candidates: Candidate[] = [{ gearSet: {}, score: startScore(), slotCounts: {} }];

  const requiredOptions = getItemOptions(gearOptions, "required");
  reqs.forEach((requirement) => {
    const req = getReq(requirement);

    const filteredGearSlots = Object.fromEntries(
      Object.entries(requiredOptions)
        .map(([slot, items]) => [slot, filterItemsForReq(req, items)])
        .filter(([, value]) => value.length),
    ) as Record<string, OptimiserItem[]>;

    let next: Candidate[] = [];
    candidates.forEach((candidate) => {
      next = next.concat(reqsBeamSearch(candidate, filteredGearSlots, req));
    });

    const newCandidates = next
      .sort((a, b) => compareScore(b.score, a.score))
      .slice(0, BEAM_WIDTH);
    candidates = newCandidates.length ? newCandidates : candidates;
  });

  return candidates;
}
