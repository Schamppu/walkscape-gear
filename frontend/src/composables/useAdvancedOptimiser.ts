import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import { useAdvancedOptimiserStore } from "@/store/advancedOptimiser";
import {
  injectBaseContext,
  injectLootTables,
} from "@/composables/context/injectShared";
import { gearSlots } from "@/domain/constants/gear";
import {
  defaultConfig,
  type AdvancedOptimiserConfig,
  type Target,
} from "@/domain/advancedOptimiser/config";
import {
  nextUnusedTarget,
  recipeProducesCraftedItem,
  sourceTableFlags,
  type TargetContext,
} from "@/domain/advancedOptimiser/targets";
import type { LootTableRef } from "@/domain/types/common";
import type { RecipeDetail } from "@/domain/types/recipe";

/**
 * Drives the advanced optimiser modal: the target context for the selected
 * activity / recipe, its config, and running the optimiser.
 *
 * For now `run()` only logs the config the optimiser would receive.
 */
export function useAdvancedOptimiser() {
  const baseCtx = injectBaseContext();
  const { hasFineDrops } = injectLootTables();
  const gearStore = useGearStore();
  const itemsStore = useItemsStore();
  const notificationStore = useNotificationStore();
  const store = useAdvancedOptimiserStore();

  const activityId = computed<string | null>(() => baseCtx.source.value?.id ?? null);

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

  const run = async (): Promise<void> => {
    if (!config.value) {
      notificationStore.warning("No activity selected");
      return;
    }
    // Plain copy without reactive proxies, as a worker job would need.
    const job = {
      config: JSON.parse(JSON.stringify(config.value)) as AdvancedOptimiserConfig,
      lockedSlots: [...lockedSlots.value],
    };
    console.log("Advanced optimiser job", job);
    await notificationStore.debug("Advanced optimiser: built job", [job]);
  };

  return {
    targetContext,
    config,
    lockedSlots,
    canAddTarget,
    addTarget,
    updateTarget,
    removeTarget,
    run,
  };
}
