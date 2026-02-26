import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import { useNotificationStore } from "@/store/notifications";
import { usePlayerStore } from "@/store/player";

import { injectBaseContext } from "@/composables/context/injectShared";
import { gearSlots, slotMax } from "@/domain/constants/gear";
import type { GearSlot } from "@/domain/constants/gear";
import type { LocationSummary } from "@/domain/types/location";

import {
  getRequiredGearOptions,
  getPrimaryGearOptions,
  getFallbackGearOptions,
  getItemOptions,
  filterMultislot,
} from "@/composables/optimiser/gear";
import { getGearSetStats } from "@/composables/optimiser/stats";
import { startScore, compareScore } from "@/composables/optimiser/score";
import { priorityName } from "@/composables/optimiser/priority";
import { getRequirementCandidates } from "@/composables/optimiser/requirements";
import {
  getReq,
  filterItemsForReq,
  contributesToReq,
  isHandledRequirement,
} from "@/domain/optimiser/requirements";
import type { Req } from "@/domain/optimiser/requirements";
import type {
  Candidate,
  FulfilledCandidate,
  GearOptions,
  GearSet,
  OptimiserItem,
} from "@/domain/optimiser/types";

/**
 * Create a gear set for a specifc activity or recipe
 * tries to optimise for a specific target (e.g. xp/step, rewards)
 *
 * Processes requirements first, so generated set is valid for the activity/recipe
 * Fills as many slots as possible with items that contribute to the target.
 * Finally fills remaining slots with items deemed generally good, even if they don't directly contribute.
 */

export function useOptimiser() {
  const baseCtx = injectBaseContext();
  const gearStore = useGearStore();
  const activityStore = useActivityStore();
  const notificationStore = useNotificationStore();
  const playerStore = usePlayerStore();

  /**
   * Returns the set of slot *keys* (e.g. `"ring"`, `"tool"`, `"weapon"`) that
   * are empty in ANY of the provided candidates.  Used to decide which slots
   * still need options generated in the next phase.
   */
  function getEmptySlotKeys(
    candidates: Candidate[],
    slots: readonly GearSlot[],
  ): Set<string> {
    const empty = new Set<string>();
    for (const { gearSet } of candidates) {
      for (const slotName of slots) {
        if (!gearSet[slotName]) {
          empty.add(slotName.replace(/\d+$/, ""));
        }
      }
    }
    return empty;
  }

  function requirementsFill(gearOptions: GearOptions): Candidate[] {
    const source = baseCtx.source.value as {
      requirements: Parameters<typeof isHandledRequirement>[0][];
    } | null;
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

    const locationPrimary = gearOptions.location
      ?.primary as (LocationSummary | null)[];
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
                candidate.slotCounts[slot] >= slotMax(slot, playerStore.level)
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

        const searchResult = beamSearch(
          usedCandidate,
          slots,
          remainingGearOptions,
        );
        candidates = candidates.concat(searchResult);
      });
    });

    return candidates
      .sort((a, b) => compareScore(b.score, a.score))
      .slice(0, 3);
  }

  /**
   * After the primary fill phase some slots may still be empty because no item
   * contributed to the selected target.  This phase greedily fills those slots
   * with the best item from the `fallback` pool — items that have *any* stats
   * (i.e., passed `filterDirectUpgrades`) even if they're unrelated to the
   * current priority.
   */
  function fallbackFill(
    slots: readonly GearSlot[],
    baseCandidates: Candidate[],
    gearOptions: GearOptions,
  ): Candidate[] {
    return baseCandidates.map((candidate) => {
      let { gearSet, slotCounts } = candidate;

      for (const slotName of slots) {
        if (gearSet[slotName]) continue;

        const slotKey = slotName.replace(/\d+$/, "");
        const fallbackItems = (gearOptions[slotKey]?.fallback ?? []) as OptimiserItem[];
        if (!fallbackItems.length) continue;

        const filteredItems = ["ring", "tool"].includes(slotKey)
          ? filterMultislot(gearSet, fallbackItems, slotKey, slotName)
          : fallbackItems;

        if (!filteredItems.length) continue;

        const [best] = filteredItems;
        gearSet = { ...gearSet, [slotName]: best };
        const prevCount = slotKey in slotCounts ? slotCounts[slotKey] : 0;
        slotCounts = { ...slotCounts, [slotKey]: prevCount + 1 };
      }

      return {
        ...candidate,
        gearSet,
        score: getGearSetStats(gearSet),
        slotCounts,
      };
    });
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

      const toolbeltSize = slotMax("tool", playerStore.level);
      const activeSlots = gearSlots.filter((slot) => {
        const toolMatch = slot.match(/^tool(\d+)$/);
        return toolMatch ? Number(toolMatch[1]) <= toolbeltSize : true;
      }) as readonly GearSlot[];

      // Phase 1: build required options for all slots, then fill requirements.
      const reqOptions = getRequiredGearOptions();
      await notificationStore.debug("Optimiser: Generated required gear options", [reqOptions]);

      const reqSets = requirementsFill(reqOptions);
      await notificationStore.debug(
        "Optimiser: Generated sets fulfilling requirements",
        [reqSets],
      );

      // Phase 2: build primary options only for slots still empty, then fill.
      const emptyAfterReq = getEmptySlotKeys(reqSets, activeSlots);
      const primaryOptions = getPrimaryGearOptions(emptyAfterReq);
      await notificationStore.debug("Optimiser: Generated primary gear options", [primaryOptions]);

      const primarySets = gearFill(activeSlots, reqSets, primaryOptions, "primary");
      await notificationStore.debug(
        "Optimiser: Created gear sets with items helping target",
        [primarySets],
      );

      // Phase 3: build fallback options only for slots still empty, then fill.
      const emptyAfterPrimary = getEmptySlotKeys(primarySets, activeSlots);
      const fallbackOptions = getFallbackGearOptions(emptyAfterPrimary);
      await notificationStore.debug("Optimiser: Generated fallback gear options", [fallbackOptions]);

      const fallbackSets = fallbackFill(activeSlots, primarySets, fallbackOptions);
      await notificationStore.debug(
        "Optimiser: Filled remaining empty slots with fallback items",
        [fallbackSets],
      );

      const [usedSet] = fallbackSets.sort((a, b) => compareScore(b.score, a.score));

      await gearStore.unequipAll();
      if (usedSet.gearSet.location) {
        const location = usedSet.gearSet.location as LocationSummary;
        await activityStore.setLocation(
          location as unknown as import("@/domain/types/location").LocationDetail,
        );
        await notificationStore.debug(
          `Optimiser: Selected location ${location?.name}`,
          [location],
        );
      }

      await gearStore.equipMultiple(
        usedSet.gearSet as Record<
          string,
          { id?: string; quality?: string | null } | null
        >,
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
