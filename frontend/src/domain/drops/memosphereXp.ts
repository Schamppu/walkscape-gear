/**
 * Purpose:
 * Pure helpers for the XP gained from memospheres — immediate consumables whose
 * ability grants `timesLevel × skill level` XP in one skill (e.g. a woodcutting
 * memosphere at woodcutting 80 grants 20 × 80 = 1600 XP). Memospheres arrive
 * from activity drops, chests and abilities (e.g. Study Time), so their XP is
 * aggregated per step across every drop map they can appear in.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access stores or perform side effects.
 */

import type { AbilityAction, AbilityDetail } from "@/domain/types/ability";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { BreakdownLine } from "@/domain/drops/aggregateDropValue";

type ExperienceAction = Extract<AbilityAction, { type: "experience" }>;

/** A memosphere item resolved to the skill and XP-per-level it grants. */
export type MemosphereDef = {
  itemId: string;
  icon: string;
  skill: string;
  xpPerLevel: number;
};

/** The minimal memosphere item shape needed to resolve its ability. */
export type MemosphereItem = {
  id: string;
  icon: string;
  abilities?: string[] | null;
};

/** Memosphere XP per step: the total and one breakdown line per memosphere. */
export type MemosphereXp = {
  total: number;
  /** `value` is XP per step (not per 1k steps). */
  breakdown: BreakdownLine[];
};

/**
 * Returns the first `experience` action of type `timesLevel` in an ability's
 * action data, or null if it has none.
 */
export function extractExperienceAction(
  detail: Pick<AbilityDetail, "data"> | null | undefined,
): ExperienceAction | null {
  for (const dataBlock of detail?.data ?? []) {
    for (const action of dataBlock.actions ?? []) {
      if (action.type !== "experience") continue;
      if (action.experienceType === "timesLevel" && action.timesLevel) return action;
    }
  }
  return null;
}

/**
 * Resolves each memosphere item to the skill and XP-per-level its ability
 * grants. Items whose ability detail isn't loaded (or grants no `timesLevel`
 * XP) are skipped.
 */
export function buildMemosphereDefs(
  items: MemosphereItem[],
  abilityDetailsMap: Record<string, Pick<AbilityDetail, "data">>,
): Record<string, MemosphereDef> {
  const defs: Record<string, MemosphereDef> = {};
  for (const item of items) {
    for (const abilityId of item.abilities ?? []) {
      const action = extractExperienceAction(abilityDetailsMap[abilityId]);
      if (!action) continue;
      defs[item.id] = {
        itemId: item.id,
        icon: item.icon,
        skill: action.skill,
        xpPerLevel: action.timesLevel!,
      };
      break;
    }
  }
  return defs;
}

/**
 * Sums the XP per step gained from memospheres across the given drop maps
 * (activity, chest contents, ability rolls). Each map's `stepsPerItem` is
 * already an overall steps-per-memosphere figure, so rates add directly.
 */
export function computeMemosphereXp(
  dropMaps: Record<string, DropItemInfo>[],
  defs: Record<string, MemosphereDef>,
  skillLevels: Record<string, number>,
): MemosphereXp {
  const itemsPerStep: Record<string, number> = {};
  for (const dropMap of dropMaps) {
    for (const [id, info] of Object.entries(dropMap)) {
      if (!(id in defs)) continue;
      const steps = info.stepsPerItem;
      if (!Number.isFinite(steps) || steps <= 0) continue;
      itemsPerStep[id] = (itemsPerStep[id] ?? 0) + 1 / steps;
    }
  }

  const breakdown: BreakdownLine[] = Object.entries(itemsPerStep)
    .map(([id, rate]) => {
      const def = defs[id];
      const xp = def.xpPerLevel * (skillLevels[def.skill] ?? 1);
      return { icon: def.icon, label: def.itemId, value: rate * xp };
    })
    .sort((a, b) => b.value - a.value);

  const total = breakdown.reduce((sum, line) => sum + line.value, 0);
  return { total, breakdown };
}
