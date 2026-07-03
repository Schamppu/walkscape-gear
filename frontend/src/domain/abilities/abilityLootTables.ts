/**
 * Purpose:
 * Pure helpers for the loot tables an ability rolls via a `rollLootTable`
 * action (e.g. "Present Rain", "Rock And Roll"). These abilities roll one or
 * more loot tables a fixed number of times on activation.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access stores or perform side effects.
 */

import type { AbilityDetail } from "@/domain/types/ability";
import type { Requirement } from "@/domain/types/common";

/** One `rollLootTable` roll: a set of table ids rolled `rollAmount` times. */
export type AbilityLootSpec = {
  rollAmount: number;
  type: string[];
  tableIds: string[];
};

type RollLootTableEntry = {
  rollAmount?: number;
  type?: string[];
  tables?: string[];
};

/**
 * Extracts the `rollLootTable` roll specs from an ability's action data.
 * Returns [] for abilities that don't roll loot tables.
 */
export function extractAbilityLootSpecs(
  detail: Pick<AbilityDetail, "data"> | null | undefined,
): AbilityLootSpec[] {
  if (!detail?.data?.length) return [];

  const specs: AbilityLootSpec[] = [];
  for (const dataBlock of detail.data) {
    for (const action of dataBlock.actions ?? []) {
      if (action.type !== "rollLootTable") continue;
      const entries = (action.tables as RollLootTableEntry[] | undefined) ?? [];
      for (const entry of entries) {
        const tableIds = (entry.tables ?? []).filter(Boolean);
        if (!tableIds.length) continue;
        specs.push({
          rollAmount: entry.rollAmount ?? 1,
          type: entry.type ?? [],
          tableIds,
        });
      }
    }
  }
  return specs;
}

/** Whether the ability rolls any loot table. */
export function rollsLootTable(
  detail: Pick<AbilityDetail, "data"> | null | undefined,
): boolean {
  return extractAbilityLootSpecs(detail).length > 0;
}

/**
 * The requirements that gate whether the ability can trigger in the current
 * context — its own requirements plus its cooldown requirements (which is where
 * activity/skill/equipment gating lives, e.g. Rock And Roll's mining gating).
 */
export function abilityUsageRequirements(
  detail: Pick<AbilityDetail, "requirements" | "cooldown"> | null | undefined,
): Requirement[] {
  if (!detail) return [];
  return [
    ...(detail.requirements ?? []),
    ...(detail.cooldown?.requirements ?? []),
  ];
}

/**
 * Steps between activations for an actions-based cooldown, or `null` for a
 * time-based cooldown (where steps don't apply). One activation becomes
 * available every `cooldown.actions` completed actions.
 */
export function abilityStepsPerActivation(
  cooldown: (AbilityDetail["cooldown"] & { actions?: number | null }) | undefined,
  stepsPerAction: number,
): number | null {
  const actions = cooldown?.actions;
  if (!actions || actions <= 0) return null;
  return stepsPerAction * actions;
}
