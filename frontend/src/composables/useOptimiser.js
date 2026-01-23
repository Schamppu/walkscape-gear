import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import useBaseContext from "@/composables/context/useBaseContext";
import { gearSlots } from "@/utils/createEmptyGearSet";

import {
  getGearOptions,
  getItemOptions,
  filterMultislot,
  slotMax,
} from "@/utils/optimiser/gear";
import { getGearSetStats } from "@/utils/optimiser/stats";
import { startScore, compareScore } from "@/utils/optimiser/score";
import {
  getReq,
  filterItemsForReq,
  getRequirementCandidates,
} from "@/utils/optimiser/requirements";

export function useOptimiser() {
  const baseCtx = useBaseContext();
  const gearStore = useGearStore();
  const activityStore = useActivityStore();

  function requirementsFill(gearOptions) {
    const reqs = baseCtx.source.value.requirements;
    let candidates = [{ gearSet: {}, score: startScore(), slotCounts: {} }];
    const requiredOptions = getItemOptions(gearOptions, "required");

    const handledReqTypes = [
      "distinctKeywordItemsEquipped",
      "keywordEquipped",
      "keywordWithLevelEquipped",
      "abilityAvailable",
    ];

    reqs.forEach((requirement) => {
      if (!handledReqTypes.includes(requirement.type)) return;
      let next = [];

      const req = getReq(requirement);

      const filteredGearSlots = Object.fromEntries(
        Object.entries(requiredOptions)
          .map(([slot, items]) => [slot, filterItemsForReq(req, items)])
          .filter(([, value]) => value.length),
      );
      candidates.forEach((candidate) => {
        next = next.concat(reqsBeamSearch(candidate, filteredGearSlots, req));
      });

      const newCandidates = next
        .sort((a, b) => compareScore(b.score, a.score))
        .slice(0, 3);
      candidates = newCandidates.length ? newCandidates : candidates;
    });
    return candidates;
  }

  function reqsBeamSearch(baseCandidate, gearOptions, req) {
    const BEAM_WIDTH = 3;
    const { gearSet, slotCounts } = baseCandidate;
    let candidates = [
      { gearSet, score: startScore(), slotCounts, fulfilled: 0 },
    ];

    const candidatesPool = getRequirementCandidates(gearOptions, req);

    for (const { slotName, slotKey, item } of candidatesPool) {
      const next = [];

      for (const { gearSet, fulfilled, slotCounts } of candidates) {
        // Skip if slot already used
        if (gearSet[slotName]) continue;

        // Skip if requirement already fulfilled
        if (fulfilled >= req.quantity) continue;

        const newSet = {
          ...gearSet,
          [slotName]: item,
        };

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
          // Prefer fulfilled
          if (a.fulfilled !== b.fulfilled) {
            return b.fulfilled - a.fulfilled;
          }
          // Prefer fewer slots used
          const slotsA = Object.keys(a.gearSet).length;
          const slotsB = Object.keys(b.gearSet).length;
          if (slotsA !== slotsB) {
            return slotsA - slotsB;
          }
          return compareScore(b.score, a.score);
        })
        .slice(0, BEAM_WIDTH);
    }

    return candidates.filter((c) => c.fulfilled >= req.quantity);
  }

  function beamSearch(baseCandidate, gearSlots, gearOptions) {
    const BEAM_WIDTH = 3;
    let candidates = [baseCandidate];

    for (const slotName of gearSlots) {
      // Skip slots already filled by requirements
      if (baseCandidate.gearSet[slotName]) {
        continue;
      }

      const slotKey = slotName.replace(/\d+$/, "");
      const options = gearOptions[slotKey]?.length ? gearOptions[slotKey] : [];

      const next = [];

      for (const { gearSet, slotCounts } of candidates) {
        const filteredOptions = ["ring", "tool"].includes(slotKey)
          ? filterMultislot(gearSet, options, slotKey, slotName)
          : options;

        for (const item of filteredOptions) {
          const newSet = {
            ...gearSet,
            [slotName]: item,
          };

          const score = getGearSetStats(newSet);
          const prevCount = slotKey in slotCounts ? slotCounts[slotKey] : 0;
          const newSlotCount = { ...slotCounts, [slotName]: prevCount + 1 };

          next.push({
            gearSet: newSet,
            score,
            slotCounts: newSlotCount,
          });
        }
      }

      const newCandidates = next
        .sort((a, b) => compareScore(b.score, a.score))
        .slice(0, BEAM_WIDTH);
      candidates = newCandidates.length ? newCandidates : candidates;
    }

    return candidates;
  }

  function gearFill(gearSlots, baseCandidates, gearOptions, gearKey) {
    let candidates = baseCandidates.length
      ? baseCandidates
      : [{ gearSet: {}, score: startScore(), slotCounts: {} }];

    gearOptions.location.primary.forEach((location) => {
      candidates.forEach((candidate) => {
        const remainingGearOptions = Object.fromEntries(
          Object.entries(getItemOptions(gearOptions, gearKey)).filter(
            ([slot]) =>
              !(
                slot in candidate.slotCounts &&
                candidate.slotCounts[slot] >= slotMax(slot)
              ),
          ),
        );

        const usedCandidate = {
          ...candidate,
          gearSet: { ...candidate.gearSet, location: location },
        };
        const searchResult = beamSearch(
          usedCandidate,
          gearSlots,
          remainingGearOptions,
        );
        candidates = candidates.concat(searchResult);
      });
    });

    return candidates
      .sort((a, b) => compareScore(b.score, a.score))
      .slice(0, 3);
  }

  const optimise = async () => {
    const options = getGearOptions();

    const reqSets = requirementsFill(options);
    const primarySets = gearFill(gearSlots, reqSets, options, "primary");

    const [usedSet] = primarySets;

    await gearStore.unequipAll();
    await activityStore.setLocation(usedSet.gearSet.location);
    await gearStore.equipMultiple(usedSet.gearSet, true);
  };

  return {
    optimise,
  };
}
