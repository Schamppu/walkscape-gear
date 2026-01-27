import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import { useNotificationStore } from "@/store/notifications";

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
  handledReqTypes,
  getReq,
  filterItemsForReq,
  getRequirementCandidates,
  contributesToReq,
} from "@/utils/optimiser/requirements";

export function useOptimiser() {
  const baseCtx = useBaseContext();
  const gearStore = useGearStore();
  const activityStore = useActivityStore();
  const notificationStore = useNotificationStore();

  function requirementsFill(gearOptions) {
    const reqs = baseCtx.source.value.requirements;
    let candidates = [{ gearSet: {}, score: startScore(), slotCounts: {} }];
    const requiredOptions = getItemOptions(gearOptions, "required");

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
    const startingFulfilled = Object.entries(gearSet).filter(([, item]) =>
      contributesToReq(item, req),
    ).length;

    let candidates = [
      {
        gearSet,
        score: startScore(),
        slotCounts,
        fulfilled: startingFulfilled,
      },
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

    const locationOptions = gearOptions.location.primary || [null];
    locationOptions.forEach((location) => {
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
    if (!baseCtx.source.value) {
      notificationStore.warning("No activity selected");
      return;
    }

    try {
      await notificationStore.success(
        `Generating gear set for ${baseCtx.source.value.name}`,
      );
      const options = getGearOptions();
      await notificationStore.debug("Generated gear options", options);

      const reqSets = requirementsFill(options);
      await notificationStore.debug(
        "Generated sets fulfilling requirements",
        reqSets,
      );

      const primarySets = gearFill(gearSlots, reqSets, options, "primary");
      await notificationStore.debug(
        "Created gear sets with items helping target",
        primarySets,
      );

      const [usedSet] = primarySets;

      await gearStore.unequipAll();
      await activityStore.setLocation(usedSet.gearSet.location.name);
      await notificationStore.debug(
        `Selected location ${usedSet.gearSet.location.name}`,
        usedSet.gearSet.location,
      );

      await gearStore.equipMultiple(usedSet.gearSet, true);
      await notificationStore.debug("Equipped gear set", usedSet);
    } catch (e) {
      notificationStore.error("Error duing gear set creation");
      console.error(e);
    }
  };

  return {
    optimise,
  };
}
