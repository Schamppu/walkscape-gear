/**
 * Purpose:
 * Pure calculation functions for loot table resolution and drop-chance math.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs
 * - Access any stores or global state
 * - Perform network requests
 * - Mutate inputs
 */

import type {
  LootTableRow,
  DetailedLootTable,
  DetailedContextLootTable,
  MappedTableRow,
} from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Weight resolution
// ---------------------------------------------------------------------------

export function resolveRowWeight(
  rowWeight: number,
  minWeightScale: number,
  levelRequirement: number,
  levelMaxScaling: number,
  level: number,
): number {
  if (level < levelRequirement) {
    return 0;
  } else if (level >= levelMaxScaling) {
    return rowWeight;
  } else if (
    rowWeight / (levelMaxScaling - levelRequirement + 1) < 1 &&
    level === levelRequirement
  ) {
    return Math.floor(rowWeight * minWeightScale * 10 + 0.5) / 10;
  } else {
    const weightIncrement = rowWeight / (levelMaxScaling - levelRequirement + 1);
    const weight = weightIncrement * (level - (levelRequirement - 1));
    return Math.floor(weight * 10 + 0.5) / 10;
  }
}

export function resolveLootTableWeights(
  tables: DetailedLootTable[],
  getSkillLevel: (skill: string) => number,
): DetailedLootTable[] {
  const tableRows = tables.map((table) =>
    table.tableRows.map((row: LootTableRow) => {
      const { rowWeight, minWeightScale, requirementsBonuses } = row;
      return {
        ...row,
        rowWeight: requirementsBonuses?.length
          ? resolveRowWeight(
              rowWeight,
              minWeightScale,
              requirementsBonuses[0].levelRequirement,
              requirementsBonuses[0].levelMaxScaling,
              getSkillLevel(requirementsBonuses[0].relatedSkill),
            )
          : rowWeight,
      };
    }),
  );
  return tables.map((table, index) => ({
    ...table,
    tableRows: tableRows[index],
  }));
}

// ---------------------------------------------------------------------------
// Table flattening
// ---------------------------------------------------------------------------

export function mapTableToItems(
  table: DetailedContextLootTable,
): MappedTableRow[] {
  const { rollAmount, rollChance, slot, type, tableSource, stat } = table;
  return (
    table.tables?.flatMap(({ noDropChance, tableRows }) => {
      const mappedRows = tableRows.map((row) => ({ ...row, noDropChance }));
      const tableWeight = mappedRows.reduce(
        (acc, row) => acc + (row.rowWeight || 0),
        0,
      );
      return mappedRows.map((row) => ({
        ...row,
        tableWeight,
        rollAmount,
        slot,
        stat,
        type,
        tableSource,
        rollChance,
      }));
    }) ?? []
  );
}

// ---------------------------------------------------------------------------
// Source grouping
// ---------------------------------------------------------------------------

export function groupSourcesByStat(
  sources: MappedTableRow[],
): Record<string, MappedTableRow[]> {
  return sources.reduce<Record<string, MappedTableRow[]>>((groups, source) => {
    const statKey = source.stat ?? "default";
    if (!groups[statKey]) groups[statKey] = [];
    groups[statKey].push(source);
    return groups;
  }, {});
}

export function getCombinedRollChance(sources: MappedTableRow[]): number {
  return sources.reduce((sum, source) => sum + (source.rollChance || 1), 0);
}

// ---------------------------------------------------------------------------
// Drop-chance calculations
// ---------------------------------------------------------------------------

/**
 * @param multiplier - pre-computed drop multiplier for the source's table type
 *                     (e.g. chestFind, findCollectibles…); caller resolves this
 *                     from reactive context so the function stays pure.
 */
export function computeRollChance(
  source: MappedTableRow,
  combinedRollChance: number | null,
  multiplier: number,
): number {
  const { rowWeight, tableWeight, noDropChance, rollChance } = source;
  const effectiveRollChance = Math.min(
    1,
    combinedRollChance ?? rollChance ?? 1,
  );
  return (1 - noDropChance) * effectiveRollChance * (rowWeight / tableWeight) * multiplier;
}

export function computeSourceDropChance(
  source: MappedTableRow,
  combinedRollChance: number | null,
  multiplier: number,
): number {
  const baseOdds = computeRollChance(source, combinedRollChance, multiplier);
  return 1 - (1 - baseOdds) ** source.rollAmount;
}

export function getTotalDropChance(
  groupedSources: Record<string, MappedTableRow[]>,
  getMultiplier: (type: string[]) => number,
): number {
  const statGroupProbabilities = Object.values(groupedSources).map(
    (sourcesInGroup) => {
      const template = sourcesInGroup[0];
      const multiplier = getMultiplier(template.type);
      if (sourcesInGroup.length === 1) {
        return computeSourceDropChance(template, null, multiplier);
      }
      const combinedRollChance = getCombinedRollChance(sourcesInGroup);
      return computeSourceDropChance(template, combinedRollChance, multiplier);
    },
  );
  const probabilityNone = statGroupProbabilities.reduce(
    (acc, prob) => acc * (1 - prob),
    1,
  );
  return Math.round(100 * (1 - probabilityNone) * 10000) / 10000;
}

export function getStepsPerItem(
  groupedSources: Record<string, MappedTableRow[]>,
  stepsPerRewardRoll: number,
  getMultiplier: (type: string[]) => number,
): number {
  const stepsPerStatGroup = Object.values(groupedSources).map(
    (sourcesInGroup) => {
      const template = sourcesInGroup[0];
      const multiplier = getMultiplier(template.type);
      const { rowMinimumAmount, rowMaximumAmount, rollAmount } = template;
      const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;
      const combinedRollChance =
        sourcesInGroup.length > 1 ? getCombinedRollChance(sourcesInGroup) : null;
      const dropChance = computeRollChance(template, combinedRollChance, multiplier);
      const expectedItemsPerAction = rollAmount * dropChance * avgAmount;
      return stepsPerRewardRoll / expectedItemsPerAction;
    },
  );
  return (
    1 / stepsPerStatGroup.map((steps) => 1 / steps).reduce((a, b) => a + b, 0)
  );
}

export function getDropCounts(
  groupedSources: Record<string, MappedTableRow[]>,
): string {
  return Object.values(groupedSources)
    .map((sourcesInGroup) => {
      const { rowMinimumAmount, rowMaximumAmount } = sourcesInGroup[0];
      return rowMinimumAmount === rowMaximumAmount
        ? `${rowMinimumAmount}`
        : `${rowMinimumAmount}-${rowMaximumAmount}`;
    })
    .join(", ");
}
