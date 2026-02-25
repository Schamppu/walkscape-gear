/**
 * Purpose:
 * Types and pure functions for computing per-item drop info from loot tables.
 *
 * Responsibilities:
 * - Resolve drop-chance multipliers from find modifiers.
 * - Derive variable-requirement display data from a loot table row.
 * - Build the complete drop info map used by the UI.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores or global state.
 * - Mutate inputs.
 */

import {
  groupSourcesByStat,
  getTotalDropChance,
  getStepsPerItem,
  getDropCounts,
} from "@/domain/lootTables/lootTables";
import type { MappedTableRow } from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Find-modifier values needed to resolve drop-chance multipliers. */
export type FindModifiers = {
  chestFind: number;
  findCollectibles: number;
  findGems: number;
  findBirdNests: number;
};

export type VariableRequirement = {
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
// Multiplier resolution
// ---------------------------------------------------------------------------

/**
 * Returns the combined drop-chance multiplier for a loot table type array,
 * by multiplying the relevant find modifiers together.
 */
export function resolveDropMultiplier(
  types: string[],
  findModifiers: FindModifiers,
): number {
  let multiplier = 1;
  if (types.includes("chestTable")) multiplier *= findModifiers.chestFind;
  if (types.includes("collectible")) multiplier *= findModifiers.findCollectibles;
  if (types.includes("gem")) multiplier *= findModifiers.findGems;
  if (types.includes("birdNest")) multiplier *= findModifiers.findBirdNests;
  return multiplier;
}

// ---------------------------------------------------------------------------
// Variable requirement
// ---------------------------------------------------------------------------

/**
 * Derives the `VariableRequirement` display entry from the first
 * `requirementsBonus` on a row. Returns `null` when none is present.
 *
 * @param item          The loot table row to inspect.
 * @param skillsMap     Pre-resolved `{ [skillId]: { icon } }` map from the player store.
 */
export function getVariableRequirement(
  item: MappedTableRow,
  skillsMap: Record<string, { icon: string }>,
): VariableRequirement | null {
  if (!item?.requirementsBonuses?.length) return null;
  const { levelRequirement, relatedSkill } = item.requirementsBonuses[0];
  return { levelRequirement, icon: skillsMap[relatedSkill]?.icon ?? "" };
}

// ---------------------------------------------------------------------------
// Drop info map
// ---------------------------------------------------------------------------

/**
 * Builds the complete `Record<itemId, DropItemInfo>` from a list of
 * per-item grouped source rows.
 *
 * @param combinedDrops      Output of `deduplicateAndGroupDrops`.
 * @param stepsPerRewardRoll Current steps-per-reward-roll modifier.
 * @param fineMaterialFind   Current fine-material-find modifier (as a fraction, e.g. 0.01).
 * @param getMultiplier      Callback that resolves the drop multiplier for a type array.
 * @param fineMaterialIds    Set of item ids that can drop as fine materials.
 * @param skillsMap       `{ [skillId]: { icon } }` lookup for variable requirements.
 */
export function buildDropItemInfoMap(
  combinedDrops: MappedTableRow[][],
  stepsPerRewardRoll: number,
  fineMaterialFind: number,
  getMultiplier: (types: string[]) => number,
  fineMaterialIds: Record<string, boolean>,
  skillsMap: Record<string, { icon: string }>,
): Record<string, DropItemInfo> {
  const canDropFine = (item: MappedTableRow): boolean =>
    !item.isMoney && !!item.rowItemID && item.rowItemID in fineMaterialIds;

  const canDropRare = (item: MappedTableRow): boolean =>
    item.type.includes("petEgg");

  const entries = combinedDrops.map((sources) => {
    const id = sources[0].rowItemID || "gold";
    const statGroupedSources = groupSourcesByStat(sources);

    const stepsPerItem = getStepsPerItem(
      statGroupedSources,
      stepsPerRewardRoll,
      getMultiplier,
    );

    const stepsPerFine = canDropFine(sources[0])
      ? stepsPerItem / fineMaterialFind
      : 0;

    const stepsPerRare = canDropRare(sources[0]) ? stepsPerItem * 10 : 0;

    let stepsPerNormal = stepsPerItem;
    if (canDropFine(sources[0])) {
      stepsPerNormal = stepsPerItem / (1 - fineMaterialFind);
    } else if (canDropRare(sources[0])) {
      stepsPerNormal = stepsPerItem / (9 / 10);
    }

    const info: DropItemInfo = {
      id,
      icon: sources[0].icon,
      sources,
      totalDropChance: getTotalDropChance(statGroupedSources, getMultiplier),
      stepsPerItem,
      itemsPerStep: 1000 / stepsPerItem,
      stepsPerNormal,
      stepsPerFine,
      stepsPerRare,
      dropCounts: getDropCounts(statGroupedSources),
      variableRequirement: getVariableRequirement(sources[0], skillsMap),
    };

    return [id, info] as [string, DropItemInfo];
  });

  return Object.fromEntries(entries);
}
