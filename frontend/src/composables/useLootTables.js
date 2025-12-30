import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import {
  getCtxLootTables,
  normalizeLootTable,
  mapTableToItems,
} from "@/utils/lootTables";

export function useLootTables(ctx) {
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
  } = useSkillModifiers(ctx);

  const lootTables = computed(() => getCtxLootTables(ctx));
  const lootTableIds = computed(() =>
    lootTables.value.flatMap(({ tables }) => tables)
  );

  watch(
    lootTableIds,
    (ids) => {
      dataStore.fetchDetailedLootTables(ids);
    },
    { immediate: true }
  );

  const detailedLootTables = computed(() => {
    return lootTables.value.flatMap((table) => ({
      ...table,
      rollChance: table.rollChance || 1,
      tables: normalizeLootTable(
        table.tables.map(dataStore.getDetailedLootTable).filter(Boolean)
      ),
    }));
  });

  const filteredLootTables = computed(() => {
    const hideOwnedCollectibles =
      activitySettings.value.hideOwnedCollectibles.value;

    if (!hideOwnedCollectibles) {
      return detailedLootTables.value;
    }

    return detailedLootTables.value.filter((table) => {
      if (hideOwnedCollectibles && table.type.includes("collectible")) {
        const id = table.tables?.[0]?.tableRows?.[0]?.rowItemID || null;
        return (
          id in itemsStore.ownedCollectibles &&
          !itemsStore.ownedCollectibles[id]
        );
      }
      return table.tables.some((t) => t.tableRows.length > 0);
    });
  });

  const combinedItemDrops = computed(() => {
    const allItems = filteredLootTables.value.flatMap((table) => {
      return mapTableToItems(table) || [];
    });

    const seen = new Set();
    const uniqueItems = allItems.filter((item) => {
      const itemId = item.isMoney ? "gold" : item.rowItemID;
      const key = `${itemId}::${item.tableSource}::${item.slot}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const grouped = {};
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

  const groupedLootTables = computed(() => {
    const grouped = {};
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
            grouped[key].rollChance + table.rollChance
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

  const dropChanceMultipliers = (tableTypes) => {
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

  const groupSourcesByStat = (sources) => {
    return sources.reduce((groups, source) => {
      const statKey = source.stat || "default";
      if (!groups[statKey]) {
        groups[statKey] = [];
      }
      groups[statKey].push(source);
      return groups;
    }, {});
  };

  const getCombinedRollChance = (sourcesInGroup) => {
    return sourcesInGroup.reduce((sum, source) => {
      return sum + (source.rollChance || 1);
    }, 0);
  };

  const rollChance = (source, combinedRollChance = null) => {
    const { rowWeight, tableWeight, noDropChance, rollChance, type } = source;
    const effectiveRollChance = Math.min(
      1,
      combinedRollChance ?? (rollChance || 1)
    );
    return (
      (1 - noDropChance) *
      effectiveRollChance *
      (rowWeight / tableWeight) *
      dropChanceMultipliers(type)
    );
  };

  const sourceDropChance = (source, combinedRollChance = null) => {
    const baseOdds = rollChance(source, combinedRollChance);
    const { rollAmount } = source;
    return 1 - (1 - baseOdds) ** rollAmount;
  };

  const getTotalDropChance = (groupedSources) => {
    // Calculate probability for each stat group
    const statGroupProbabilities = Object.values(groupedSources).map(
      (sourcesInGroup) => {
        if (sourcesInGroup.length === 1) {
          // Single source, use normal calculation
          return sourceDropChance(sourcesInGroup[0]);
        } else {
          // Multiple sources with same stat, sum their rollChance values
          const combinedRollChance = getCombinedRollChance(sourcesInGroup);

          // Use the first source as template but with combined rollChance
          return sourceDropChance(sourcesInGroup[0], combinedRollChance);
        }
      }
    );

    // Calculate overall probability (1 - probability that none of the stat groups proc)
    const probabilityNone = statGroupProbabilities.reduce(
      (acc, prob) => acc * (1 - prob),
      1
    );
    const totalChance = 100 * (1 - probabilityNone);
    const rounded = Math.round(totalChance * 10000) / 10000;
    return rounded;
  };

  const getStepsPerItem = (groupedSources) => {
    // Calculate steps per source for each stat group
    const stepsPerStatGroup = Object.values(groupedSources).map(
      (sourcesInGroup) => {
        if (sourcesInGroup.length === 1) {
          // Single source, use normal calculation
          const source = sourcesInGroup[0];
          const { rowMinimumAmount, rowMaximumAmount, rollAmount } = source;
          const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;
          const dropChance = rollChance(source);
          const expectedItemsPerAction = rollAmount * dropChance * avgAmount;

          return stepsPerRewardRoll.value / expectedItemsPerAction;
        } else {
          // Multiple sources with same stat, sum their rollChance values
          const combinedRollChance = getCombinedRollChance(sourcesInGroup);

          // Use the first source as template but with combined rollChance
          const templateSource = sourcesInGroup[0];
          const { rowMinimumAmount, rowMaximumAmount, rollAmount } =
            templateSource;
          const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;

          const dropChance = rollChance(templateSource, combinedRollChance);

          // Expected items per action = rolls * individual chance * avg amount
          const expectedItemsPerAction = rollAmount * dropChance * avgAmount;

          return stepsPerRewardRoll.value / expectedItemsPerAction;
        }
      }
    );

    return (
      1 / stepsPerStatGroup.map((steps) => 1 / steps).reduce((a, b) => a + b, 0)
    );
  };

  const getDropCounts = (groupedSources) => {
    // Calculate counts for each stat group
    const statGroupCounts = Object.values(groupedSources).map(
      (sourcesInGroup) => {
        // For sources with the same stat, they should have the same drop amounts
        // (just with higher chance due to combined rollChance)
        // So we just show the drop count from the first source in the group
        const { rowMinimumAmount, rowMaximumAmount } = sourcesInGroup[0];
        if (rowMinimumAmount === rowMaximumAmount) {
          return `${rowMinimumAmount}`;
        }
        return `${rowMinimumAmount}-${rowMaximumAmount}`;
      }
    );

    return statGroupCounts.join(", ");
  };

  const getVariableRequirement = (item) => {
    if (!item || !item.requirementsBonuses) return null;

    const { requirementsBonuses } = item;
    if (!requirementsBonuses.length) return null;
    const { levelRequirement, relatedSkill } = requirementsBonuses[0];

    const icon = playerStore.skillsMap[relatedSkill].icon;
    return { levelRequirement, icon };
  };

  const dropItemInfoMap = computed(() => {
    const getId = (sources) => sources[0].rowItemID || "gold";
    const canDropFine = (item) =>
      !item.isMoney && item.rowItemID in itemsStore.fineMaterials;

    const data = combinedItemDrops.value.map((sources) => {
      const id = getId(sources);
      const icon = sources[0].icon;
      const statGroupedSources = groupSourcesByStat(sources);
      const stepsPerItem = getStepsPerItem(statGroupedSources);
      // todo add info for rare pets

      const stepsPerFine = canDropFine(sources[0])
        ? stepsPerItem / fineMaterialFind.value
        : 0;

      const stepsPerNormal = canDropFine(sources[0])
        ? stepsPerItem / (1 - fineMaterialFind.value)
        : stepsPerItem;

      const info = {
        id,
        icon,
        sources,
        totalDropChance: getTotalDropChance(statGroupedSources),
        stepsPerItem,
        itemsPerStep: 1000 / stepsPerItem,
        stepsPerNormal,
        stepsPerFine,
        dropCounts: getDropCounts(statGroupedSources),
        variableRequirement: getVariableRequirement(sources[0]),
      };
      return [id, info];
    });
    return Object.fromEntries(data);
  });

  return {
    lootTables,
    detailedLootTables,
    filteredLootTables,
    combinedItemDrops,
    groupedLootTables,
    dropItemInfoMap,
    groupSourcesByStat,
  };
}
