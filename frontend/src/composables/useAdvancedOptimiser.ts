import { computed, ref, shallowRef, watch } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import { useAdvancedOptimiserStore } from "@/store/advancedOptimiser";
import {
  injectBaseContext,
  injectFineMaterials,
  injectLootTables,
} from "@/composables/context/injectShared";
import { installScorer } from "@/composables/optimiser/stats";
import { prefetchPetAbilityDetails } from "@/composables/optimiser/petAbilities";
import { buildAdvancedJob } from "@/composables/advancedOptimiser/buildJob";
import { runAdvancedJob, type RunningJob } from "@/composables/advancedOptimiser/runWorker";
import { applySearchResult } from "@/composables/advancedOptimiser/applyResult";
import { gearSlots } from "@/domain/constants/gear";
import {
  defaultConfig,
  type AdvancedOptimiserConfig,
  type Target,
} from "@/domain/advancedOptimiser/config";
import {
  DEFAULT_SEARCH_SETTINGS,
  type SearchProgress,
  type SearchResult,
} from "@/domain/advancedOptimiser/search";
import type { LocationSummary } from "@/domain/types/location";
import {
  isTargetValid,
  nextUnusedTarget,
  recipeProducesCraftedItem,
  sourceTableFlags,
  type TargetContext,
} from "@/domain/advancedOptimiser/targets";
import type { LootTableRef } from "@/domain/types/common";
import type { RecipeDetail } from "@/domain/types/recipe";

/**
 * Drives the advanced optimiser modal: the target context for the selected
 * activity / recipe, its config (saved per activity), and running the
 * optimiser in a worker, then applying the best set.
 */
export function useAdvancedOptimiser() {
  const baseCtx = injectBaseContext();
  const { hasFineDrops } = injectLootTables();
  const { fineMode } = injectFineMaterials();
  const activityStore = useActivityStore();
  const gearStore = useGearStore();
  const itemsStore = useItemsStore();
  const notificationStore = useNotificationStore();
  const store = useAdvancedOptimiserStore();

  const activityId = computed<string | null>(() => baseCtx.source.value?.id ?? null);

  /** The most recent finished run, for the result summary. */
  const lastRun = shallowRef<{
    result: SearchResult;
    targets: Target[];
    /** False when the run was cancelled and nothing was equipped. */
    applied: boolean;
    locationName: string | null;
  } | null>(null);

  // Bring in the saved config when an activity is selected; a previous
  // run's summary belongs to the previous activity.
  watch(
    activityId,
    (id) => {
      lastRun.value = null;
      if (id) store.load(id);
    },
    { immediate: true },
  );

  const targetContext = computed<TargetContext>(() => {
    const source = baseCtx.source.value as
      | { tables?: LootTableRef[] | null }
      | null;
    const isRecipe = baseCtx.recipeSelected.value;
    const producesCraftedItem =
      isRecipe &&
      recipeProducesCraftedItem(
        baseCtx.source.value as RecipeDetail,
        (id) => (itemsStore.allGearItems[id] ?? itemsStore.materials[id])?.type,
      );

    return {
      isRecipe,
      producesCraftedItem,
      ...sourceTableFlags(source?.tables),
      hasFineMaterials: hasFineDrops.value,
    };
  });

  const config = computed<AdvancedOptimiserConfig | null>(() => {
    const id = activityId.value;
    if (!id) return null;
    return store.configs[id] ?? defaultConfig(id);
  });

  const lockedSlots = computed(() => gearSlots.filter((slot) => gearStore.isSlotLocked(slot)));

  const canAddTarget = computed<boolean>(
    () => !!config.value && nextUnusedTarget(config.value.targets, targetContext.value) !== null,
  );

  const addTarget = (): void => {
    if (!activityId.value || !config.value) return;
    const target = nextUnusedTarget(config.value.targets, targetContext.value);
    if (target) store.addTarget(activityId.value, target);
  };

  const updateTarget = (index: number, patch: Partial<Target>): void => {
    if (activityId.value) store.updateTarget(activityId.value, index, patch);
  };

  const removeTarget = (index: number): void => {
    if (activityId.value) store.removeTarget(activityId.value, index);
  };

  const running = ref(false);
  const progress = shallowRef<SearchProgress | null>(null);
  let current: RunningJob | null = null;

  /** Runs the optimiser on the current config and equips the best set found. */
  const run = async (): Promise<void> => {
    if (running.value) return;
    if (!config.value) {
      notificationStore.warning("No activity selected");
      return;
    }
    const targets = config.value.targets.filter(
      (t) => t.weight > 0 && isTargetValid(t, targetContext.value),
    );
    if (!targets.length) {
      notificationStore.warning("Give at least one target a weight above 0");
      return;
    }

    running.value = true;
    progress.value = null;
    lastRun.value = null;
    try {
      await prefetchPetAbilityDetails();
      const uninstallScorer = installScorer();
      let job;
      try {
        job = buildAdvancedJob({
          config: { ...config.value, targets },
          producesCraftedItem: targetContext.value.producesCraftedItem,
          fineMode: fineMode.value,
        });
      } finally {
        uninstallScorer();
      }
      if (!job) return;
      await notificationStore.debug("Advanced optimiser: built job", [job]);

      current = runAdvancedJob(job, { onProgress: (p) => (progress.value = p) });
      const result = await current.result;
      await notificationStore.debug("Advanced optimiser: result", [result]);

      const applied = await applySearchResult(result, job.searchSlots, {
        setLocation: (location) => activityStore.setLocation(location),
        equipMultiple: (data, useQuality) => gearStore.equipMultiple(data, useQuality),
      });
      if (applied) notificationStore.success("Optimised gear set equipped");

      const location = result.gearSet.location as LocationSummary | null | undefined;
      lastRun.value = {
        result,
        targets: job.targets,
        applied,
        locationName: (location ?? job.defaultLocation)?.name ?? null,
      };
    } catch (e) {
      notificationStore.error("Error during gear set optimisation");
      console.error(e);
    } finally {
      current = null;
      progress.value = null;
      running.value = false;
    }
  };

  /** Stops a running search; the gear set is left unchanged. */
  const cancel = (): void => current?.cancel();

  return {
    targetContext,
    config,
    lockedSlots,
    canAddTarget,
    addTarget,
    updateTarget,
    removeTarget,
    running,
    progress,
    lastRun,
    timeBudgetMs: DEFAULT_SEARCH_SETTINGS.timeBudgetMs,
    run,
    cancel,
  };
}
