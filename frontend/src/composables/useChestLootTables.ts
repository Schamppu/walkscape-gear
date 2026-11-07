/**
 * Purpose:
 * Reactive composable for resolving the loot table contents of chest
 * (container) items that drop during an activity or recipe.
 *
 * Watches the chest item IDs derived from the current dropItemInfoMap and
 * triggers on-demand fetches of their inner loot tables via useDataStore,
 * mirroring the pattern used in useLootTables.
 */

import { computed, watch, type ComputedRef } from "vue";
import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import {
  identifyChestItems,
  buildChestDropInfoMap,
} from "@/domain/lootTables/chestLootTables";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { LootTableRef } from "@/domain/types/common";
import type { LootTableDetail } from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChestLootTableInfo = {
  chestItemId: string;
  name: string;
  icon: string;
  stepsPerChest: number;
  dropInfoMap: Record<string, DropItemInfo>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useChestLootTables(
  dropItemInfoMap: ComputedRef<Record<string, DropItemInfo>>,
): ComputedRef<ChestLootTableInfo[]> {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();

  // Chest items identified from the activity's drop map.
  const chestItems = computed(() =>
    identifyChestItems(dropItemInfoMap.value, itemsStore.containers),
  );

  // All inner loot table IDs across all chest items.
  const innerTableIds = computed<string[]>(() =>
    chestItems.value.flatMap(({ chestItemId }) => {
      const item = itemsStore.containers[chestItemId];
      return item
        ? (item.tables as LootTableRef[]).flatMap((ref) => ref.tables)
        : [];
    }),
  );

  // Fetch inner tables whenever IDs change.
  watch(innerTableIds, (ids) => dataStore.fetchDetailedLootTables(ids), {
    immediate: true,
  });

  // Resolve into full ChestLootTableInfo entries.
  return computed<ChestLootTableInfo[]>(() =>
    chestItems.value.map(({ chestItemId, stepsPerChest }) => {
      const item = itemsStore.containers[chestItemId];
      const refs = item ? (item.tables as LootTableRef[]) : [];

      const detailedTables: LootTableDetail[] = refs
        .flatMap((ref) => ref.tables)
        .map(dataStore.getDetailedLootTable)
        .filter((t): t is LootTableDetail => t !== null);

      return {
        chestItemId,
        name: item?.name ?? chestItemId,
        icon: item?.icon ?? "",
        stepsPerChest,
        dropInfoMap: buildChestDropInfoMap(
          stepsPerChest,
          detailedTables,
          itemsStore.fineMaterials,
        ),
      };
    }),
  );
}
