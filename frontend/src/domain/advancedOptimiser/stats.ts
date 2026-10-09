/**
 * Purpose:
 * Which stats can change each `X / Y` target, used to narrow down the items
 * the optimiser considers.
 *
 * These lists decide which *stats* matter, never whether an *item* is good:
 * an item stays a candidate if any of its stats is useful, including negative
 * stats and stats gated by set requirements. Item quality is only judged by
 * scoring whole gear sets (see `extracted` in `targets.ts`).
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 */

import type { components } from "@/domain/types/generated/api";
import type { Target, XValue, YValue } from "./config";

export type StatId = components["schemas"]["StatId"];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stats that change how much of X one action yields. */
export const USEFUL_STATS_BY_X: Record<XValue, readonly StatId[]> = {
  xp: ["bonus_experience"],
  rewardRolls: ["double_rewards"],
  fineMaterials: ["double_rewards", "fine_material_finding"],
  collectibles: ["double_rewards", "find_collectibles"],
  chests: ["double_rewards", "chest_finding"],
  tokens: ["double_rewards", "fine_material_finding"],
  // Net coins: material cost per action falls with no materials consumed.
  coins: [
    "double_rewards",
    "fine_material_finding",
    "chest_finding",
    "find_collectibles",
    "find_gems",
    "find_bird_nests",
    "quality_outcome",
    "no_materials_consumed",
  ],
  eternalCrafts: ["double_rewards", "quality_outcome"],
};

/**
 * Stats that change how much Y one action takes. Measured per action, the
 * step cost of an action doesn't matter.
 */
export const USEFUL_STATS_BY_Y: Record<YValue, readonly StatId[]> = {
  step: ["work_efficiency", "steps_required", "double_action"],
  action: ["double_action"],
  material: ["no_materials_consumed"],
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export const usefulStatsFor = ({ x, y }: Pick<Target, "x" | "y">): StatId[] => [
  ...new Set([...USEFUL_STATS_BY_X[x], ...USEFUL_STATS_BY_Y[y]]),
];

/** Useful stats across all targets that have a weight above 0. */
export const unionUsefulStats = (targets: readonly Target[]): StatId[] => [
  ...new Set(targets.filter(({ weight }) => weight > 0).flatMap(usefulStatsFor)),
];
