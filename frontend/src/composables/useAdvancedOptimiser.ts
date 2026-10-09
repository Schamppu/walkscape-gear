import { computed, ref, shallowRef, watch } from "vue";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import { useAdvancedOptimiserStore } from "@/store/advancedOptimiser";
import {
  injectBaseContext,
  injectFineMaterials,
  injectLootTables,
  injectRequirements,
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
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import {
  isTargetValid,
  nextUnusedTarget,
  recipeProducesCraftedItem,
  sourceTableFlags,
  type TargetContext,
} from "@/domain/advancedOptimiser/targets";
import { tokenValues } from "@/domain/constants/tokenValues";
import type { LootTableRef } from "@/domain/types/common";
import type { RecipeDetail } from "@/domain/types/recipe";

/**
 * Drives the advanced optimiser modal: the target context for the selected
 * activity / recipe, its config (saved per activity), and running the
 * optimiser in a worker, then applying the best set.
 */
export function useAdvancedOptimiser() {
  const baseCtx = injectBaseContext();
  const { hasFineDrops, dropItemInfoMap } = injectLootTables();
  const { fineMode } = injectFineMaterials();
  const { canBeEquipped } = injectRequirements();
  const activityStore = useActivityStore();
  const dataStore = useDataStore();
  const settingsStore = useSettingsStore();
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
      hasTokens: Object.keys(dropItemInfoMap.value).some((id) => id in tokenValues),
    };
  });

  const config = computed<AdvancedOptimiserConfig | null>(() => {
    const id = activityId.value;
    if (!id) return null;
    return store.configs[id] ?? defaultConfig(id);
  });

  const lockedSlots = computed(() => gearSlots.filter((slot) => gearStore.isSlotLocked(slot)));

  /**
   * Locked slots whose item the player can't equip yet (requirements unmet).
   * Allowed on purpose: locking an item you don't meet the requirements for
   * plans the rest of the set around it ("what if I had this").
   */
  const unusableLockedSlots = computed(() =>
    lockedSlots.value.filter((slot) => {
      const item = gearStore.selectedGearset[slot];
      return !!item && !canBeEquipped(item as Parameters<typeof canBeEquipped>[0]);
    }),
  );

  /** Show the "Export job" button (Optimiser operations debug setting). */
  const canExportJob = computed(
    () => settingsStore.toolSettings.debugOptimiser?.value === true,
  );

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
  /** Set when the user stops a run: Finish applies the best set so far, Cancel doesn't. */
  let stoppedWith: "cancel" | "finish" | null = null;

  /**
   * Validates the config and builds the worker job, or warns and returns
   * `null`. Loads the activity's loot tables first (for chest / token rates).
   */
  const prepareJob = async (): Promise<AdvancedOptimiserJob | null> => {
    if (!config.value) {
      notificationStore.warning("No activity selected");
      return null;
    }
    const targets = config.value.targets.filter(
      (t) => t.weight > 0 && isTargetValid(t, targetContext.value),
    );
    if (!targets.length) {
      notificationStore.warning("Give at least one available target a weight above 0");
      return null;
    }

    const source = baseCtx.source.value as { tables?: LootTableRef[] | null } | null;
    await Promise.all([
      prefetchPetAbilityDetails(),
      dataStore.fetchDetailedLootTables((source?.tables ?? []).flatMap(({ tables }) => tables)),
    ]);

    const uninstallScorer = installScorer();
    try {
      return buildAdvancedJob({
        config: { ...config.value, targets },
        producesCraftedItem: targetContext.value.producesCraftedItem,
        fineMode: fineMode.value,
      });
    } finally {
      uninstallScorer();
    }
  };

  /** Runs the optimiser on the current config and equips the best set found. */
  const run = async (): Promise<void> => {
    if (running.value) return;
    running.value = true;
    progress.value = null;
    lastRun.value = null;
    stoppedWith = null;
    try {
      const job = await prepareJob();
      if (!job) return;
      await notificationStore.debug("Advanced optimiser: built job", [job]);

      current = runAdvancedJob(job, { onProgress: (p) => (progress.value = p) });
      const result = await current.result;
      await notificationStore.debug("Advanced optimiser: result", [result]);

      const applied = await applySearchResult(result, job.searchSlots, {
        setLocation: (location) => activityStore.setLocation(location),
        equipMultiple: (data, useQuality) => gearStore.equipMultiple(data, useQuality),
      }, { applyStopped: stoppedWith === "finish" });
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

  /**
   * Downloads the job the optimiser would run as JSON, for replaying in the
   * benchmark (`test/fixtures/advancedOptimiser/jobs/`).
   */
  const exportJob = async (): Promise<void> => {
    try {
      const job = await prepareJob();
      if (!job) return;
      const blob = new Blob([JSON.stringify(job)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `optimiser-job-${activityId.value}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notificationStore.error("Error exporting optimiser job");
      console.error(e);
    }
  };

  /** Stops a running search; the gear set is left unchanged. */
  const cancel = (): void => {
    stoppedWith = "cancel";
    current?.cancel();
  };

  /** Stops a running search early and equips the best set found so far. */
  const finish = (): void => {
    stoppedWith = "finish";
    current?.cancel();
  };

  return {
    targetContext,
    config,
    lockedSlots,
    unusableLockedSlots,
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
    finish,
    canExportJob,
    exportJob,
  };
}
