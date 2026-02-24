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

// ---------------------------------------------------------------------------
// Merge strategies
// ---------------------------------------------------------------------------

type MergeStrategy = {
  canMerge(a: Requirement, b: Requirement): boolean;
  merge(a: Requirement, b: Requirement): Requirement;
};

const mergeStrategies: Partial<Record<string, MergeStrategy>> = {
  distinctKeywordItemsEquipped: {
    canMerge(a, b) {
      return (
        a.opposite === b.opposite &&
        JSON.stringify(a.requirement["keywords"]) ===
          JSON.stringify(b.requirement["keywords"])
      );
    },
    merge(a, b) {
      return {
        ...a,
        requirement: {
          ...a.requirement,
          quantity: Math.max(
            a.requirement["quantity"] as number,
            b.requirement["quantity"] as number,
          ),
        },
      };
    },
  },

  abilityAvailable: {
    canMerge(a, b) {
      return (
        a.opposite === b.opposite &&
        a.requirement["ability"] === b.requirement["ability"]
      );
    },
    merge(a) {
      return a;
    },
  },

  skillLevel: {
    canMerge(a, b) {
      return (
        a.opposite === b.opposite &&
        a.requirement["skill"] === b.requirement["skill"]
      );
    },
    merge(a, b) {
      return {
        ...a,
        requirement: {
          ...a.requirement,
          level: Math.max(
            a.requirement["level"] as number,
            b.requirement["level"] as number,
          ),
        },
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
  for (const { type, requirement } of requirements) {
    if (type !== "skillLevel") continue;
    const skill = requirement["skill"] as string;
    const level = requirement["level"] as number;
    map[skill] = level;
  }
  return map;
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
