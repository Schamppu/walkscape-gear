/**
 * Purpose:
 * Pure domain functions for processing and merging game requirements.
 *
 * Does NOT:
 * - Import Vue or Pinia.
 * - Access stores or reactive state.
 * - Contain any side effects.
 */

import type { Requirement } from "@/domain/types/common";
import type {
  AbilityAvailableRequirement,
  DistinctKeywordItemsEquippedRequirement,
  MainSkillRequirement,
  SkillLevelRequirement,
} from "@/domain/types/requirement";

// ---------------------------------------------------------------------------
// Merge strategies
// ---------------------------------------------------------------------------

type MergeStrategy = {
  canMerge(a: Requirement, b: Requirement): boolean;
  merge(a: Requirement, b: Requirement): Requirement;
};

const mergeStrategies: Partial<Record<Requirement["type"], MergeStrategy>> = {
  distinctKeywordItemsEquipped: {
    canMerge(a, b) {
      const ra = (a as DistinctKeywordItemsEquippedRequirement).requirement;
      const rb = (b as DistinctKeywordItemsEquippedRequirement).requirement;
      return (
        a.opposite === b.opposite &&
        JSON.stringify(ra.keywords) === JSON.stringify(rb.keywords)
      );
    },
    merge(a, b) {
      const aTyped = a as DistinctKeywordItemsEquippedRequirement;
      const ra = aTyped.requirement;
      const rb = (b as DistinctKeywordItemsEquippedRequirement).requirement;
      return {
        ...aTyped,
        requirement: { ...ra, quantity: Math.max(ra.quantity, rb.quantity) },
      };
    },
  },

  abilityAvailable: {
    canMerge(a, b) {
      const ra = (a as AbilityAvailableRequirement).requirement;
      const rb = (b as AbilityAvailableRequirement).requirement;
      return a.opposite === b.opposite && ra.ability === rb.ability;
    },
    merge(a) {
      return a;
    },
  },

  skillLevel: {
    canMerge(a, b) {
      const ra = (a as SkillLevelRequirement).requirement;
      const rb = (b as SkillLevelRequirement).requirement;
      return a.opposite === b.opposite && ra.skill === rb.skill;
    },
    merge(a, b) {
      const aTyped = a as SkillLevelRequirement;
      const ra = aTyped.requirement;
      const rb = (b as SkillLevelRequirement).requirement;
      return {
        ...aTyped,
        requirement: { ...ra, level: Math.max(ra.level, rb.level) },
      };
    },
  },
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Build a map of skill → minimum required level from a list of requirements.
 * Only `skillLevel` requirements contribute; all others are ignored.
 *
 * @example
 * getLevelRequirementsMap([{ type: "skillLevel", requirement: { skill: "fishing", level: 20 }, ... }])
 * // → { fishing: 20 }
 */
export function getLevelRequirementsMap(
  requirements: Requirement[] | null | undefined,
): Record<string, number> {
  if (!requirements) return {};

  const map: Record<string, number> = {};
  for (const req of requirements) {
    if (req.type !== "skillLevel") continue;
    const { skill, level } = req.requirement;
    if (skill in map) {
      map[skill] = Math.max(map[skill], level);
    } else {
      map[skill] = level;
    }
  }
  return map;
}

export function getMainSkillRequirement(
  requirements: Requirement[] | null | undefined,
): string | null {
  if (!requirements) return null;
  const mainSkillReq = requirements.find((req) => req.type === "mainSkill") as
    | MainSkillRequirement
    | undefined;
  return mainSkillReq ? mainSkillReq.requirement.skill : null;
}

export function getDistinctKeywordItemsEquippedRequirement(
  requirements: Requirement[] | null | undefined,
): { quantity: number; keywords: string[] } | null {
  if (!requirements) return null;
  const req = requirements.find(
    (r) => r.type === "distinctKeywordItemsEquipped",
  ) as DistinctKeywordItemsEquippedRequirement | undefined;
  return req ? req.requirement : null;
}

/**
 * Collapse duplicate requirements of the same type using built-in merge
 * strategies. Requirements whose type has no strategy are kept as-is.
 *
 * Merge rules:
 * - `distinctKeywordItemsEquipped` - keeps the highest required quantity.
 * - `abilityAvailable` - keeps the first entry (both sides are equivalent).
 * - `skillLevel` - keeps the highest required level for each skill.
 */
export function mergeRequirements(requirements: Requirement[]): Requirement[] {
  const result: Requirement[] = [];

  for (const req of requirements) {
    const strategy = mergeStrategies[req.type];

    if (!strategy) {
      result.push(req);
      continue;
    }

    let merged = false;
    for (let i = 0; i < result.length; i++) {
      const existing = result[i];
      if (existing.type === req.type && strategy.canMerge(existing, req)) {
        result[i] = strategy.merge(existing, req);
        merged = true;
        break;
      }
    }

    if (!merged) {
      result.push(req);
    }
  }

  return result;
}
