import { computed, watch, type ComputedRef, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { useRequirements, type RequirementContext } from "@/composables/useRequirements";
import { useAbilityAttrContext } from "@/composables/useAbilityAttrContext";
import { attachPetAbilityAttrs } from "@/domain/abilities/petAbilityAttrs";
import { groupSourcesByStat, resolveLootTableWeights } from "@/domain/lootTables/lootTables";
import {
  resolveSourceContextTables,
  resolveGearContextTables,
  filterDetailedTables,
  deduplicateAndGroupDrops,
  mergeTableGroups,
} from "@/domain/lootTables/contextTables";
import {
  resolveDropMultiplier,
  buildDropItemInfoMap,
  type FindModifiers,
  type DropItemInfo,
  type VariableRequirement,
} from "@/domain/lootTables/dropInfo";
import type {
  ContextLootTable,
  DetailedContextLootTable,
  DetailedLootTable,
  MappedTableRow,
} from "@/domain/types/lootTable";
import type { LootTableRef } from "@/domain/types/common";
import type { EquippedItem } from "@/store/gear";
import type { Setting } from "@/constants/settings";
import type { SkillModifiersSource } from "@/domain/skillModifiers";

export type { DropItemInfo, VariableRequirement };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Extends `SkillModifiersSource` with the loot-table fields accessed
 * directly by this composable (`name`, `tables`).
 */
export type LootTablesSource = SkillModifiersSource & {
  name: string;
  tables?: LootTableRef[];
};

export type LootTablesContext = Omit<SkillModifiersContext, "source"> & {
  source: Ref<LootTablesSource | null>;
  filledGearSlots: Ref<[string, EquippedItem][]>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useLootTables(ctx: LootTablesContext): {
  lootTables: ComputedRef<ContextLootTable[]>;
  detailedLootTables: ComputedRef<DetailedContextLootTable[]>;
  filteredLootTables: ComputedRef<DetailedContextLootTable[]>;
  combinedItemDrops: ComputedRef<MappedTableRow[][]>;
  groupedLootTables: ComputedRef<DetailedContextLootTable[]>;
  dropItemInfoMap: ComputedRef<Record<string, DropItemInfo>>;
  groupSourcesByStat: (sources: MappedTableRow[]) => Record<string, MappedTableRow[]>;
  hasCollectibleDrops: ComputedRef<boolean>;
  hasFineDrops: ComputedRef<boolean>;
} {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();
  const playerStore = usePlayerStore();
  const settingsStore = useSettingsStore();
  const { activitySettings } = storeToRefs(settingsStore);

  const { checkRequirements } = useRequirements(ctx as unknown as RequirementContext);
  const abilityCtx = useAbilityAttrContext();
  const {
    stepsPerRewardRoll,
    fineMaterialFind,
    chestFind,
    findCollectibles,
    findGems,
    findBirdNests,
  } = useSkillModifiers(ctx as unknown as SkillModifiersContext);

  // Attach the pet slot occupant's ability attributes so ability-sourced loot
  // tables (e.g. rollSpecialTable) surface in the drops context.
  const filledGearSlotsWithAbilities = computed(() =>
    ctx.filledGearSlots.value.map(
      ([slot, item]) =>
        [slot, attachPetAbilityAttrs(item, abilityCtx.value)] as [
          string,
          typeof item,
        ],
    ),
  );

  const lootTables = computed<ContextLootTable[]>(() => [
    ...resolveSourceContextTables(ctx.source.value),
    ...resolveGearContextTables(
      filledGearSlotsWithAbilities.value,
      (reqs) => checkRequirements(reqs),
    ),
  ]);

  const lootTableIds = computed<string[]>(() =>
    lootTables.value.flatMap(({ tables }) => tables),
  );

  watch(lootTableIds, (ids: string[]) => dataStore.fetchDetailedLootTables(ids), {
    immediate: true,
  });

  const detailedLootTables = computed<DetailedContextLootTable[]>(() =>
    lootTables.value.map((table) => ({
      ...table,
      rollChance: table.rollChance || 1,
      tables: resolveLootTableWeights(
        table.tables
          .map(dataStore.getDetailedLootTable)
          .filter((t): t is NonNullable<typeof t> => t !== null) as DetailedLootTable[],
        (skill: string) => playerStore.skillLevels[skill] ?? 1,
      ),
    })),
  );

  const filteredLootTables = computed<DetailedContextLootTable[]>(() => {
    const hideOwnedCollectibles = (
      activitySettings.value.hideOwnedCollectibles as Setting<boolean>
    ).value;
    const ownedCollectibleIds = ctx
      .ownedItemsByCategory("collectible")
      .map(({ id }) => id);
    return filterDetailedTables(
      detailedLootTables.value,
      hideOwnedCollectibles,
      ownedCollectibleIds,
    );
  });

  const combinedItemDrops = computed<MappedTableRow[][]>(() =>
    deduplicateAndGroupDrops(filteredLootTables.value),
  );

  const groupedLootTables = computed<DetailedContextLootTable[]>(() =>
    mergeTableGroups(filteredLootTables.value),
  );

  const dropItemInfoMap = computed<Record<string, DropItemInfo>>(() => {
    const findModifiers: FindModifiers = {
      chestFind: chestFind.value,
      findCollectibles: findCollectibles.value,
      findGems: findGems.value,
      findBirdNests: findBirdNests.value,
    };
    return buildDropItemInfoMap(
      combinedItemDrops.value,
      stepsPerRewardRoll.value,
      fineMaterialFind.value,
      (types) => resolveDropMultiplier(types, findModifiers),
      itemsStore.fineMaterials,
      playerStore.skillsMap,
    );
  });

  const hasCollectibleDrops = computed<boolean>(() =>
    filteredLootTables.value.some(({ type }) => type.includes("collectible")),
  );

  const hasFineDrops = computed<boolean>(() =>
    Object.values(dropItemInfoMap.value).some(({ stepsPerFine }) => stepsPerFine > 0),
  );

  return {
    lootTables,
    detailedLootTables,
    filteredLootTables,
    combinedItemDrops,
    groupedLootTables,
    dropItemInfoMap,
    groupSourcesByStat,
    hasCollectibleDrops,
    hasFineDrops,
  };
}
