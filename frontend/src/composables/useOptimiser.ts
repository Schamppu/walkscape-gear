import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import { useNotificationStore } from "@/store/notifications";

import useBaseContext from "@/composables/context/useBaseContext";
import { gearSlots } from "@/domain/constants/gear";
import type { GearSlot } from "@/domain/constants/gear";
import type { LocationSummary } from "@/domain/types/location";

import {
  getGearOptions,
  getItemOptions,
  filterMultislot,
  slotMax,
} from "@/utils/optimiser/gear";
import { getGearSetStats } from "@/utils/optimiser/stats";
import { startScore, compareScore } from "@/utils/optimiser/score";
import { priorityName } from "@/utils/optimiser/priority";
import {
  getReq,
  filterItemsForReq,
  getRequirementCandidates,
  contributesToReq,
  isHandledRequirement,
} from "@/utils/optimiser/requirements";
import type { Req } from "@/utils/optimiser/requirements";
import type {
  Candidate,
  FulfilledCandidate,
  GearOptions,
  GearSet,
  OptimiserItem,
} from "@/utils/optimiser/types";

export function useOptimiser() {
  const baseCtx = useBaseContext();
  const gearStore = useGearStore();
  const activityStore = useActivityStore();
  const notificationStore = useNotificationStore();

  function requirementsFill(gearOptions: GearOptions): Candidate[] {
    const source = baseCtx.source.value as { requirements: Parameters<typeof isHandledRequirement>[0][] } | null;
    const reqs = (source?.requirements ?? []).filter(isHandledRequirement);

    let candidates: Candidate[] = [
      { gearSet: {}, score: startScore(), slotCounts: {} },
    ];

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
        .slice(0, 3);
      candidates = newCandidates.length ? newCandidates : candidates;
    });

    return candidates;
  }

  function reqsBeamSearch(
    baseCandidate: Candidate,
    gearOptions: Record<string, OptimiserItem[]>,
    req: Req,
  ): FulfilledCandidate[] {
    const BEAM_WIDTH = 3;
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

  function beamSearch(
    baseCandidate: Candidate,
    slots: readonly GearSlot[],
    gearOptions: Record<string, (OptimiserItem | LocationSummary)[]>,
  ): Candidate[] {
    const BEAM_WIDTH = 3;
    let candidates: Candidate[] = [baseCandidate];

    for (const slotName of slots) {
      if (baseCandidate.gearSet[slotName]) continue;

      const slotKey = slotName.replace(/\d+$/, "");
      const options = gearOptions[slotKey]?.length
        ? (gearOptions[slotKey] as OptimiserItem[])
        : [];

      const next: Candidate[] = [];

      for (const { gearSet, slotCounts } of candidates) {
        const filteredOptions = ["ring", "tool"].includes(slotKey)
          ? filterMultislot(gearSet, options, slotKey, slotName)
          : options;

        for (const item of filteredOptions) {
          const newSet: GearSet = { ...gearSet, [slotName]: item };
          const score = getGearSetStats(newSet);
          const prevCount = slotKey in slotCounts ? slotCounts[slotKey] : 0;
          const newSlotCount = { ...slotCounts, [slotName]: prevCount + 1 };

          next.push({ gearSet: newSet, score, slotCounts: newSlotCount });
        }
      }

      const newCandidates = next
        .sort((a, b) => compareScore(b.score, a.score))
        .slice(0, BEAM_WIDTH);
      candidates = newCandidates.length ? newCandidates : candidates;
    }

    return candidates;
  }

  function gearFill(
    slots: readonly GearSlot[],
    baseCandidates: Candidate[],
    gearOptions: GearOptions,
    gearKey: "primary",
  ): Candidate[] {
    let candidates: Candidate[] = baseCandidates.length
      ? baseCandidates
      : [{ gearSet: {}, score: startScore(), slotCounts: {} }];

    const locationPrimary = gearOptions.location?.primary as (LocationSummary | null)[];
    const locationOptions: (LocationSummary | null)[] = locationPrimary?.length
      ? locationPrimary
      : [null];

    locationOptions.forEach((location) => {
      candidates.forEach((candidate) => {
        const primaryOptions = getItemOptions(gearOptions, gearKey);
        const remainingGearOptions = Object.fromEntries(
          Object.entries(primaryOptions).filter(
            ([slot]) =>
              !(
                slot in candidate.slotCounts &&
                candidate.slotCounts[slot] >= slotMax(slot)
              ),
          ),
        ) as Record<string, (OptimiserItem | LocationSummary)[]>;

        const usedCandidate: Candidate = {
          ...candidate,
          gearSet: {
            ...candidate.gearSet,
            location: location ?? baseCtx.location.value,
          },
        };

        const searchResult = beamSearch(usedCandidate, slots, remainingGearOptions);
        candidates = candidates.concat(searchResult);
      });
    });

    return candidates
      .sort((a, b) => compareScore(b.score, a.score))
      .slice(0, 3);
  }

  const optimise = async (): Promise<void> => {
    if (!baseCtx.source.value) {
      notificationStore.warning("No activity selected");
      return;
    }

    try {
      await notificationStore.success(
        `Generating gear set with target ${priorityName()}`,
      );
      const options = getGearOptions();
      await notificationStore.debug("Optimiser: Generated gear options", [options]);

      const reqSets = requirementsFill(options);
      await notificationStore.debug(
        "Optimiser: Generated sets fulfilling requirements",
        [reqSets],
      );

      const primarySets = gearFill(gearSlots, reqSets, options, "primary");
      await notificationStore.debug(
        "Optimiser: Created gear sets with items helping target",
        [primarySets],
      );

      const [usedSet] = primarySets;

      await gearStore.unequipAll();
      if (usedSet.gearSet.location) {
        const location = usedSet.gearSet.location as LocationSummary;
        await activityStore.setLocation(location as unknown as import("@/domain/types/location").LocationDetail);
        await notificationStore.debug(
          `Optimiser: Selected location ${location?.name}`,
          [location],
        );
      }

      await gearStore.equipMultiple(
        usedSet.gearSet as Record<string, { id?: string; quality?: string | null } | null>,
        true,
      );
      await notificationStore.debug("Optimiser: Equipped gear set", [usedSet]);
    } catch (e) {
      notificationStore.error("Error duing gear set creation");
      console.error(e);
    }
  };

  return {
    optimise,
  };
}
