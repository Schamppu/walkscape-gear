/**
 * Purpose:
 * Config types for the advanced optimiser, and the default config.
 *
 * A target is an `X / Y` ratio ("what you want more of" per "what"),
 * weighted 0–10. Weight 0 disables the target.
 *
 * Slot locks are not part of the config: the optimiser reads them from the
 * gear store, same as the quick set.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Decide which targets are valid for an activity (see `targets.ts`).
 */

import type { components } from "@/domain/types/generated/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const X_VALUES = [
  "xp",
  "rewardRolls",
  "fineMaterials",
  "chests",
  "tokens",
  "coins",
  "collectibles",
  "eternalCrafts",
] as const;

export const Y_VALUES = ["step", "action", "material"] as const;

export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type XValue = (typeof X_VALUES)[number];

export type YValue = (typeof Y_VALUES)[number];

export type Target = { x: XValue; y: YValue; weight: number };

export type CombinationRule = "weightedSum";

export type AdvancedOptimiserMode =
  | { kind: "singleActivity"; activityId: string }
  | { kind: "bestForSkill"; skillId: components["schemas"]["SkillsEnum"] };

export type AdvancedOptimiserConfig = {
  mode: AdvancedOptimiserMode;
  targets: Target[];
  combinationRule: CombinationRule;
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/** Default config for a single activity or recipe. `xp / step` is valid everywhere. */
export const defaultConfig = (activityId: string): AdvancedOptimiserConfig => ({
  mode: { kind: "singleActivity", activityId },
  targets: [{ x: "xp", y: "step", weight: MAX_WEIGHT }],
  combinationRule: "weightedSum",
});

export const BEST_FOR_SKILL_STORAGE_KEY = "advancedOptimiser.bestForSkillConfig";

/** localStorage key a config is saved under. `bestForSkill` configs share one key. */
export const configStorageKey = ({ mode }: Pick<AdvancedOptimiserConfig, "mode">): string =>
  mode.kind === "singleActivity"
    ? `advancedOptimiser.config.${mode.activityId}`
    : BEST_FOR_SKILL_STORAGE_KEY;

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (values as readonly string[]).includes(value);

/**
 * Reads a stored config back, or `null` if it isn't a usable config.
 * Unknown targets and duplicate `X / Y` pairs are dropped; weights are rounded
 * and clamped to 0–10.
 */
export const parseConfig = (raw: unknown): AdvancedOptimiserConfig | null => {
  if (!raw || typeof raw !== "object") return null;
  const { mode, targets } = raw as Partial<Record<keyof AdvancedOptimiserConfig, unknown>>;

  const m = mode as Partial<{ kind: string; activityId: unknown; skillId: unknown }> | undefined;
  let parsedMode: AdvancedOptimiserMode;
  if (m?.kind === "singleActivity" && typeof m.activityId === "string") {
    parsedMode = { kind: "singleActivity", activityId: m.activityId };
  } else if (m?.kind === "bestForSkill" && typeof m.skillId === "string") {
    parsedMode = { kind: "bestForSkill", skillId: m.skillId as components["schemas"]["SkillsEnum"] };
  } else {
    return null;
  }
  if (!Array.isArray(targets)) return null;

  const seen = new Set<string>();
  const parsedTargets: Target[] = [];
  for (const t of targets as Partial<Record<keyof Target, unknown>>[]) {
    if (!isOneOf(X_VALUES, t?.x) || !isOneOf(Y_VALUES, t?.y) || typeof t.weight !== "number") {
      continue;
    }
    const key = `${t.x}/${t.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const weight = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(t.weight)));
    parsedTargets.push({ x: t.x, y: t.y, weight: Number.isFinite(weight) ? weight : MIN_WEIGHT });
  }

  return { mode: parsedMode, targets: parsedTargets, combinationRule: "weightedSum" };
};
