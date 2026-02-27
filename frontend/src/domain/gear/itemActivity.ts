/**
 * Purpose:
 * Pure functions for determining whether a gear item is useful for a given
 * activity or recipe context.
 *
 * Responsibilities:
 * - Match item abilities against activity ability requirements.
 * - Match item keywords against activity/service/travel keyword requirements.
 * - Filter item attributes down to those that provide useful bonuses in context.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

import type { Requirement } from "@/domain/types/common";
import type { Attribute } from "@/domain/quality/qualityAttrs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityAbility = string | { ability: string; unlockLevel: string };

/** Minimal item shape needed for activity-relevance filtering. */
export type ItemForActivity = {
  abilities?: ActivityAbility[];
  keywords?: string[];
  quality: string | null;
};

/** Minimal source (activity or recipe) shape needed for ability/keyword/attr filtering. */
export type SourceForItem = {
  requirements?: Requirement[];
  /** Present on recipes only; used to determine Quality outcome relevance. */
  itemRewards?: Record<string, number>;
};

export type AttrFilterOptions = {
  isRecipe: boolean;
  hasCollectibleDrops: boolean;
  hasFineDrops: boolean;
  /** IDs of every crafted item that appears in the activity's item rewards. */
  craftedRewardItemIds: string[];
  /** Injected from the composable layer — checks requirements reactively. */
  checkRequirements: (reqs: Requirement[]) => boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_ONLY_ATTRS = [
  "Fine material finding",
  "Find gems",
  "Find bird nests",
  "Find collectibles",
];

const RECIPE_ONLY_ATTRS = ["No materials consumed", "Quality outcome"];

const UNFILTERED_REQUIREMENT_TYPES = new Set(["distinctKeywordItemsEquipped"]);

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Returns the ability names from `item` that satisfy at least one
 * `abilityAvailable` requirement in `activity`.
 * Returns an empty array when item has no abilities or activity has none.
 */
export function filterUsefulAbilities(
  item: ItemForActivity,
  source: SourceForItem,
): string[] {
  if (!item.abilities?.length) return [];

  const abilityReqs = (source?.requirements ?? [])
    .filter(
      (req): req is typeof req & { type: "abilityAvailable" } =>
        req.type === "abilityAvailable",
    )
    .map(({ requirement }) => (requirement as { ability: string }).ability);

  if (!abilityReqs.length) return [];

  const itemAbilityNames = item.abilities
    .flatMap((abilityVal) => {
      if (typeof abilityVal === "string") return abilityVal;
      const { ability, unlockLevel } = abilityVal;
      return (item.quality ?? "") >= unlockLevel ? ability : null;
    })
    .filter((value): value is string => value !== null);

  return abilityReqs.filter((ability) => itemAbilityNames.includes(ability));
}

/**
 * Returns a truthy boolean for each keyword requirement in `allRequirements`
 * that the item satisfies. Pass the merged activity + service + travel
 * requirements as `allRequirements`.
 * Returns an empty array when the item has no keywords.
 */
export function filterUsefulKeywords(
  item: ItemForActivity,
  allRequirements: Requirement[],
): boolean[] {
  if (!item.keywords?.length) return [];

  return allRequirements
    .filter(({ type }) => type.toLowerCase().includes("keyword"))
    .map((req) => {
      const requirement = (req as Requirement & { requirement: Record<string, unknown> })
        .requirement;
      return "keyword" in requirement
        ? (item.keywords as string[]).includes(requirement["keyword"] as string)
        : (requirement["keywords"] as string[]).some((kw) =>
            (item.keywords as string[]).includes(kw),
          );
    })
    .filter((v) => v);
}

/**
 * Filters `attrs` down to the subset that are actually beneficial for the
 * activity / recipe context described by `options`.
 */
export function filterUsefulAttrs(
  attrs: Attribute[],
  options: AttrFilterOptions,
): Attribute[] {
  const { isRecipe, hasCollectibleDrops, hasFineDrops, craftedRewardItemIds, checkRequirements } =
    options;

  return attrs.filter((attr) => {
    // Activity-only attrs are suppressed when viewing recipes.
    if (isRecipe && ACTIVITY_ONLY_ATTRS.includes(attr.statText)) return false;

    // Recipe-only attrs are suppressed for plain activities.
    if (!isRecipe && RECIPE_ONLY_ATTRS.includes(attr.statText)) return false;

    // Quality outcome needs extra context even when in recipe mode.
    if (attr.statText === "Quality outcome") {
      const benefitsCO = craftedRewardItemIds.length > 0;
      if (!benefitsCO) return false;
    }

    if (attr.statText === "Find collectibles" && !hasCollectibleDrops) return false;
    if (attr.statText === "Fine material finding" && !hasFineDrops) return false;

    const usedRequirements =
      attr.requirements?.filter(
        (req) => !UNFILTERED_REQUIREMENT_TYPES.has(req.type),
      ) ?? [];

    if (!checkRequirements(usedRequirements)) return false;
    if (!attr.stats.some((stat) => !stat.isNegative)) return false;

    return true;
  });
}
