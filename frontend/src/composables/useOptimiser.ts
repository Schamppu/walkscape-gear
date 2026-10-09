import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import { useNotificationStore } from "@/store/notifications";

import { injectBaseContext } from "@/composables/context/injectShared";
import { priorityName, priorityValue } from "@/composables/optimiser/priority";
import { prepareAdvancedJob } from "@/composables/advancedOptimiser/buildJob";
import { runAdvancedJob } from "@/composables/advancedOptimiser/runWorker";
import { applySearchResult } from "@/composables/advancedOptimiser/applyResult";
import { QUICK_SEARCH_SETTINGS, quickSetTargets } from "@/domain/advancedOptimiser/quickSet";

/**
 * Quick set: builds a gear set for the selected activity or recipe, targeting
 * the priority chosen in settings (e.g. XP per step, reward rolls).
 *
 * Runs the advanced optimiser with a short search (`QUICK_SEARCH_SETTINGS`):
 * requirements are met first, slots are filled with items that help the
 * target, and slots still empty get generally useful items (fallback).
 */
export function useOptimiser() {
  const baseCtx = injectBaseContext();
  const gearStore = useGearStore();
  const activityStore = useActivityStore();
  const notificationStore = useNotificationStore();

  const optimise = async (): Promise<void> => {
    const source = baseCtx.source.value;
    if (!source) {
      notificationStore.warning("No activity selected");
      return;
    }

    try {
      await notificationStore.success(`Generating gear set with target ${priorityName()}`);
      const t0 = performance.now();

      const job = await prepareAdvancedJob({
        config: {
          mode: { kind: "singleActivity", activityId: source.id },
          targets: quickSetTargets(priorityValue()),
          combinationRule: "weightedSum",
        },
        fallback: true,
      });
      if (!job) return;
      await notificationStore.debug("Optimiser: built quick set job", [job]);

      const result = await runAdvancedJob(job, { settings: QUICK_SEARCH_SETTINGS }).result;
      await notificationStore.debug(
        `Optimiser: [total: ${(performance.now() - t0).toFixed(1)}ms] Done`,
        [result],
      );

      await applySearchResult(result, job.searchSlots, {
        setLocation: (location) => activityStore.setLocation(location),
        equipMultiple: (data, useQuality) => gearStore.equipMultiple(data, useQuality),
      });
      await notificationStore.debug("Optimiser: Equipped gear set", [result.gearSet]);
    } catch (e) {
      notificationStore.error("Error during gear set creation");
      console.error(e);
    }
  };

  return {
    optimise,
  };
}
