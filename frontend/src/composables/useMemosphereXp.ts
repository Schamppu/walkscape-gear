/**
 * Purpose:
 * Reactive composable aggregating the XP per step gained from memospheres
 * across the activity's drops, chest contents and ability loot rolls (e.g. the
 * Hat of wisdom's "Study Time").
 *
 * Memosphere items are loaded by the items store; their abilities (which hold
 * the XP grant) are fetched on demand here. Chest contents only count when the
 * "show chest loot tables" setting is on, matching the new-items aggregate.
 */

import { computed, watch, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useSettingsStore } from "@/store/settings";
import {
  buildMemosphereDefs,
  computeMemosphereXp,
  type MemosphereItem,
  type MemosphereXp,
} from "@/domain/drops/memosphereXp";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { ChestLootTableInfo } from "@/composables/useChestLootTables";
import type { AbilityLootTableInfo } from "@/composables/useAbilityLootTables";

export function useMemosphereXp(
  dropItemInfoMap: ComputedRef<Record<string, DropItemInfo>>,
  chestLootTables: ComputedRef<ChestLootTableInfo[]>,
  abilityLootTables: ComputedRef<AbilityLootTableInfo[]>,
): ComputedRef<MemosphereXp> {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();
  const playerStore = usePlayerStore();
  const { activitySettings } = storeToRefs(useSettingsStore());

  const memosphereItems = computed(
    () => Object.values(itemsStore.memospheres) as MemosphereItem[],
  );

  // Fetch the memosphere abilities that hold the XP grant.
  const abilityIds = computed(() =>
    memosphereItems.value.flatMap((item) => item.abilities ?? []),
  );
  watch(
    abilityIds,
    (ids) => {
      if (ids.length) void dataStore.fetchDetailedAbilities(ids);
    },
    { immediate: true },
  );

  const defs = computed(() =>
    buildMemosphereDefs(memosphereItems.value, dataStore.detailedAbilitiesMap),
  );

  const showChests = computed(
    () => activitySettings.value.showChestLootTables?.value === true,
  );

  const dropMaps = computed(() => [
    dropItemInfoMap.value,
    ...(showChests.value
      ? chestLootTables.value.map((chest) => chest.dropInfoMap)
      : []),
    // Time-based cooldowns have no per-step rate.
    ...abilityLootTables.value
      .filter((ability) => ability.stepsPerActivation !== null)
      .map((ability) => ability.dropInfoMap),
  ]);

  return computed(() =>
    computeMemosphereXp(dropMaps.value, defs.value, playerStore.skillLevels),
  );
}
