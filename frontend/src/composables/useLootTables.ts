import { computed, watch, type ComputedRef, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { usedAttrs } from "@/domain/quality/qualityAttrs";
import { stripHtmlTags } from "@/utils/stripHtmlTags";
import { useRequirements, type RequirementContext } from "@/composables/useRequirements";
import {
  resolveLootTableWeights,
  mapTableToItems,
  groupSourcesByStat,
  getTotalDropChance,
  getStepsPerItem,
  getDropCounts,
} from "@/domain/lootTables/lootTables";
import type {
  ContextLootTable,
  DetailedContextLootTable,
  DetailedLootTable,
  MappedTableRow,
} from "@/domain/types/lootTable";
import type { LootTableRef } from "@/domain/types/common";
import type { Attribute } from "@/domain/types/item";
import type { EquippedItem } from "@/store/gear";
import type { Setting } from "@/constants/settings";
import type { SkillModifiersSource } from "@/domain/skillModifiers";

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

type VariableRequirement = {
  levelRequirement: number;
  icon: string;
};

export type DropItemInfo = {
  id: string;
  icon: string | undefined;
  sources: MappedTableRow[];
  totalDropChance: number;
  stepsPerItem: number;
  itemsPerStep: number;
  stepsPerNormal: number;
  stepsPerFine: number;
  stepsPerRare: number;
  dropCounts: string;
  variableRequirement: VariableRequirement | null;
};

// ---------------------------------------------------------------------------
// Module-level helpers (no reactive deps — can be pure functions)
// ---------------------------------------------------------------------------

const getGearLootTables = (ctx: LootTablesContext): ContextLootTable[] => {
  const { checkRequirements } = useRequirements(ctx as unknown as RequirementContext);
  return ctx.filledGearSlots.value.flatMap(([slot, item]) =>
    usedAttrs(item, item.quality ?? "common")
      .filter(
        (attr: Attribute) =>
          Array.isArray(attr.tables) &&
          (attr.tables as LootTableRef[]).length > 0 &&
          checkRequirements(attr.requirements),
      )
      .flatMap((attr: Attribute) => {
        const { stats, customText } = attr;
        return (attr.tables as LootTableRef[]).map((table) => ({
          ...table,
          tableSource: stripHtmlTags(attr.customText) || (attr as Attribute & { name?: string }).name || attr.text,
          slot,
          stat: customText,
          rollChance: stats?.[0]?.value || 1,
        }));
      }),
  );
};

const getSourceLootTables = (ctx: LootTablesContext): ContextLootTable[] => {
  const source = ctx.source.value;
  if (!source) return [];
  const { tables: activityTables, name } = source;
  return (
    activityTables?.map((table) => ({
      ...table,
      tableSource: `activity-${name}`,
      rollChance: 1,
    })) ?? []
  );
};

const getCtxLootTables = (ctx: LootTablesContext): ContextLootTable[] => [
  ...getSourceLootTables(ctx),
  ...getGearLootTables(ctx),
];

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

  const {
    stepsPerRewardRoll,
    fineMaterialFind,
    chestFind,
    findCollectibles,
    findGems,
    findBirdNests,
  } = useSkillModifiers(ctx as unknown as SkillModifiersContext);

  const lootTables = computed<ContextLootTable[]>(() => getCtxLootTables(ctx));
  const lootTableIds = computed<string[]>(() =>
    lootTables.value.flatMap(({ tables }) => tables),
  );

  watch(
    lootTableIds,
    (ids: string[]) => {
      dataStore.fetchDetailedLootTables(ids);
    },
    { immediate: true },
  );

  const detailedLootTables = computed<DetailedContextLootTable[]>(() => {
    return lootTables.value.flatMap((table) => ({
      ...table,
      rollChance: table.rollChance || 1,
      tables: resolveLootTableWeights(
        table.tables.map(dataStore.getDetailedLootTable).filter((t): t is NonNullable<typeof t> => t !== null) as DetailedLootTable[],
        (skill: string) => playerStore.skillLevels[skill] ?? 1,
      ),
    }));
  });

  const filteredLootTables = computed<DetailedContextLootTable[]>(() => {
    const hideOwnedCollectibles = (
      activitySettings.value.hideOwnedCollectibles as Setting<boolean>
    ).value;

    if (!hideOwnedCollectibles) {
      return detailedLootTables.value;
    }

    const ownedCollectibles = ctx
      .ownedItemsByCategory("collectible")
      .map(({ id }) => id);
    return detailedLootTables.value.filter((table) => {
      if (hideOwnedCollectibles && table.type.includes("collectible")) {
        const id = table.tables?.[0]?.tableRows?.[0]?.rowItemID || null;
        return id === null || !ownedCollectibles.includes(id);
      }
      return table.tables.some((t) => t.tableRows.length > 0);
    });
  });

  const combinedItemDrops = computed<MappedTableRow[][]>(() => {
    const allItems = filteredLootTables.value.flatMap((table) => {
      return mapTableToItems(table) || [];
    });

    const seen = new Set<string>();
    const uniqueItems = allItems.filter((item) => {
      const itemId = item.isMoney ? "gold" : item.rowItemID;
      const key = `${itemId}::${item.tableSource}::${item.slot}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const grouped: Record<string, MappedTableRow[]> = {};
    for (const item of uniqueItems) {
      const key = item.isMoney ? "gold" : item.rowItemID;
      if (!key) continue;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return Object.values(grouped);
  });

  const groupedLootTables = computed<DetailedContextLootTable[]>(() => {
    const grouped: Record<string, DetailedContextLootTable> = {};
    for (const table of filteredLootTables.value) {
      const key = `${table.type}-${table.rollAmount}-${table.tableSource}`;
      if (!grouped[key]) {
        // Create a deep copy of the table to avoid mutation
        grouped[key] = {
          ...table,
          tables: [...table.tables],
        };
      } else {
        if (table.stat) {
          // if table comes from stat (item):
          // Combine rollChance values (capped at 1) instead of adding more tables
          const combinedRollChance = Math.min(
            1,
            grouped[key].rollChance + table.rollChance,
          );
          grouped[key] = {
            ...grouped[key],
            rollChance: combinedRollChance,
          };
        } else {
          // if table comes from activity:
          // group tables e.g. collectibles
          grouped[key] = {
            ...grouped[key],
            tables: [...grouped[key].tables, ...table.tables],
          };
        }
      }
    }
    return Object.values(grouped);
  });

  const dropChanceMultipliers = (tableTypes: string[]): number => {
    let multiplier = 1;
    if (tableTypes.includes("chestTable")) {
      multiplier *= chestFind.value;
    }
    if (tableTypes.includes("collectible")) {
      multiplier *= findCollectibles.value;
    }
    if (tableTypes.includes("gem")) {
      multiplier *= findGems.value;
    }
    if (tableTypes.includes("birdNest")) {
      multiplier *= findBirdNests.value;
    }

    return multiplier;
  };

  const getVariableRequirement = (
    item: MappedTableRow,
  ): VariableRequirement | null => {
    if (!item || !item.requirementsBonuses) return null;

    const { requirementsBonuses } = item;
    if (!requirementsBonuses.length) return null;
    const { levelRequirement, relatedSkill } = requirementsBonuses[0];

    const icon = playerStore.skillsMap[relatedSkill].icon;
    return { levelRequirement, icon };
  };

  const dropItemInfoMap = computed<Record<string, DropItemInfo>>(() => {
    const getId = (sources: MappedTableRow[]): string =>
      sources[0].rowItemID || "gold";
    const canDropFine = (item: MappedTableRow): boolean =>
      !item.isMoney && !!item.rowItemID && item.rowItemID in itemsStore.fineMaterials;

    const canDropRare = (item: MappedTableRow): boolean =>
      item.type.includes("petEgg");

    const data = combinedItemDrops.value.map((sources) => {
      const id = getId(sources);
      const icon = sources[0].icon;
      const statGroupedSources = groupSourcesByStat(sources);
      const stepsPerItem = getStepsPerItem(
        statGroupedSources,
        stepsPerRewardRoll.value,
        dropChanceMultipliers,
      );

      const stepsPerFine = canDropFine(sources[0])
        ? stepsPerItem / fineMaterialFind.value
        : 0;

      const stepsPerRare = canDropRare(sources[0]) ? stepsPerItem * 10 : 0;

      let stepsPerNormal = stepsPerItem;
      if (canDropFine(sources[0]))
        stepsPerNormal = stepsPerItem / (1 - fineMaterialFind.value);
      else if (canDropRare(sources[0]))
        stepsPerNormal = stepsPerItem / (9 / 10);

      const info: DropItemInfo = {
        id,
        icon,
        sources,
        totalDropChance: getTotalDropChance(
          statGroupedSources,
          dropChanceMultipliers,
        ),
        stepsPerItem,
        itemsPerStep: 1000 / stepsPerItem,
        stepsPerNormal,
        stepsPerFine,
        stepsPerRare,
        dropCounts: getDropCounts(statGroupedSources),
        variableRequirement: getVariableRequirement(sources[0]),
      };
      return [id, info] as [string, DropItemInfo];
    });
    return Object.fromEntries(data);
  });

  const hasCollectibleDrops = computed<boolean>(() => {
    return filteredLootTables.value.some(({ type }) =>
      type.includes("collectible"),
    );
  });

  const hasFineDrops = computed<boolean>(() => {
    return Object.values(dropItemInfoMap.value).some(
      ({ stepsPerFine }) => stepsPerFine > 0,
    );
  });

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
