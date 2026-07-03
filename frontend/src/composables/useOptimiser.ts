import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import { useNotificationStore } from "@/store/notifications";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";

import { injectBaseContext } from "@/composables/context/injectShared";
import { gearSlots, slotMax } from "@/domain/constants/gear";
import type { GearSlot } from "@/domain/constants/gear";
import type { LocationSummary } from "@/domain/types/location";
import { unlockedAbilityIds } from "@/domain/abilities/petAbilityAttrs";
import type { PetAbility } from "@/domain/types/pet";

import {
  getRequiredGearOptions,
  getPrimaryGearOptions,
  getFallbackGearOptions,
  getItemOptions,
} from "@/composables/optimiser/gear";
import {
  getGearSetStats,
  installScorer,
  buildWorkerJob,
} from "@/composables/optimiser/stats";
import type { OptimiserJobResult } from "@/workers/optimiserWorkerTypes";
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
  const itemsStore = useItemsStore();
  const dataStore = useDataStore();

  /**
   * Fetches the ability details for every owned pet's unlocked abilities, so
   * that candidate pets' ability attributes are available when the (synchronous)
   * scorer / worker job snapshots the ability context.
   */
  const prefetchPetAbilityDetails = async (): Promise<void> => {
    const ids = new Set<string>();
    for (const [id, owned] of Object.entries(itemsStore.ownedItems)) {
      const pet = itemsStore.petsMap[id] as unknown as
        | { abilities?: PetAbility[] }
        | undefined;
      if (!pet?.abilities?.length) continue;
      for (const aid of unlockedAbilityIds(pet, owned.petLevel ?? 0)) {
        ids.add(aid);
      }
    }
    if (ids.size) await dataStore.fetchDetailedAbilities([...ids]);
  };

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
    const serviceReqs = (activityStore.service?.requirements ??
      []) as Parameters<typeof isHandledRequirement>[0][];
    const reqs = (source?.requirements ?? [])
      .concat(serviceReqs)
      .filter(isHandledRequirement);

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

  /**
   * Serialises the optimiser job and runs gearFill + fallbackFill in a
   * dedicated Web Worker, keeping the main thread (and UI) responsive.
   */
  async function runWorkerJob(
    reqSets: Candidate[],
    primaryOptions: GearOptions,
    fallbackOptions: GearOptions,
    activeSlots: readonly GearSlot[],
  ): Promise<OptimiserJobResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("../workers/optimiser.worker.ts", import.meta.url),
        { type: "module" },
      );
      let jobData: ReturnType<typeof buildWorkerJob>;
      try {
        jobData = structuredClone(
          buildWorkerJob(reqSets, primaryOptions, fallbackOptions, activeSlots),
        );
      } catch (err) {
        worker.terminate();
        reject(
          new Error(
            `Optimiser worker payload serialization failed: ${String(err)}`,
          ),
        );
        return;
      }
      worker.onmessage = (e: MessageEvent<OptimiserJobResult>) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (err) => {
        reject(new Error(`Optimiser worker error: ${err.message}`));
        worker.terminate();
      };
      try {
        worker.postMessage(jobData);
      } catch (err) {
        reject(
          new Error(`Optimiser worker postMessage failed: ${String(err)}`),
        );
        worker.terminate();
      }
    });
  }

  const optimise = async (): Promise<void> => {
    if (!baseCtx.source.value) {
      notificationStore.warning("No activity selected");
      return;
    }

    // The pet slot is optimised (swapped), so ensure ability details for all
    // owned pets' unlocked abilities are fetched before the scorer/worker job
    // is built — their attributes are baked into candidate pets synchronously.
    await prefetchPetAbilityDetails();

    const uninstallScorer = installScorer();
    try {
      await notificationStore.success(
        `Generating gear set with target ${priorityName()}`,
      );

      const toolbeltSize = slotMax("tool", playerStore.level);
      const activeSlots = gearSlots.filter((slot) => {
        const toolMatch = slot.match(/^tool(\d+)$/);
        if (toolMatch && Number(toolMatch[1]) > toolbeltSize) return false;
        return !gearStore.isSlotLocked(slot);
      }) as readonly GearSlot[];

      const t0 = performance.now();
      const ts = (since: number) =>
        `${(performance.now() - since).toFixed(1)}ms`;

      // Phase 1: build required options for all slots, then fill requirements.
      let t = performance.now();
      const reqOptions = getRequiredGearOptions();
      await notificationStore.debug(
        `Optimiser: [${ts(t)}] Generated required gear options`,
        [reqOptions],
      );

      t = performance.now();
      const reqSets = requirementsFill(reqOptions);
      await notificationStore.debug(
        `Optimiser: [${ts(t)}] Generated sets fulfilling requirements`,
        [reqSets],
      );

      // Phase 2: build primary options for still-empty slots.
      t = performance.now();
      const emptyAfterReq = getEmptySlotKeys(reqSets, activeSlots);
      const primaryOptions = getPrimaryGearOptions(emptyAfterReq);
      await notificationStore.debug(
        `Optimiser: [${ts(t)}] Generated primary gear options`,
        [primaryOptions],
      );

      // Phase 3: build fallback options for the same slot set — emptyAfterPrimary
      // is unknown until the worker runs, so emptyAfterReq is used conservatively.
      t = performance.now();
      const nonFallbackSlots = ["consumable"];
      const fallBackEmpty = new Set(
        [...emptyAfterReq].filter((slot) => !nonFallbackSlots.includes(slot)),
      );
      const fallbackOptions = getFallbackGearOptions(fallBackEmpty);
      await notificationStore.debug(
        `Optimiser: [${ts(t)}] Generated fallback gear options`,
        [fallbackOptions],
      );

      // Worker phase: primary beam-search + fallback fill off the main thread.
      t = performance.now();
      const usedSet = await runWorkerJob(
        reqSets,
        primaryOptions,
        fallbackOptions,
        activeSlots,
      );
      await notificationStore.debug(
        `Optimiser: [${ts(t)}] Worker completed beam search + fallback`,
        [usedSet],
      );

      await notificationStore.debug(`Optimiser: [total: ${ts(t0)}] Done`);

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

      const equipPayload = Object.fromEntries(
        activeSlots.map((slot) => {
          const item = usedSet.gearSet[slot] as
            | { id?: string; quality?: string | null }
            | null
            | undefined;
          return [
            slot,
            item && item.id
              ? { id: item.id, quality: item.quality ?? null }
              : null,
          ];
        }),
      ) as Record<string, { id?: string; quality?: string | null } | null>;

      await gearStore.equipMultiple(equipPayload, true);
      await notificationStore.debug("Optimiser: Equipped gear set", [usedSet]);
    } catch (e) {
      notificationStore.error("Error duing gear set creation");
      console.error(e);
    } finally {
      uninstallScorer();
    }
  };

  return {
    optimise,
  };
}
