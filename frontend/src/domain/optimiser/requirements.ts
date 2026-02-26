/**
 * Purpose:
 * Pure functions for resolving, matching and sorting gear-set requirements
 * during optimiser beam-search.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 */

import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import { compareScore, isHighStat } from "@/domain/optimiser/scoring";
import { slotMax } from "@/domain/constants/gear";
import type { OptimiserItem } from "@/domain/optimiser/types";
import type {
  KeywordEquippedRequirement,
  DistinctKeywordItemsEquippedRequirement,
  KeywordWithLevelEquippedRequirement,
  AbilityAvailableRequirement,
  Requirement,
} from "@/domain/types/requirement";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const handledReqTypes = [
  "distinctKeywordItemsEquipped",
  "keywordEquipped",
  "keywordWithLevelEquipped",
  "abilityAvailable",
] as const;

export type HandledReqType = (typeof handledReqTypes)[number];

export type KeywordReq = {
  keyword: string;
  quantity: number;
  level: number;
};

export type AbilityReq = {
  ability: string;
  quantity: number;
  level: number;
};

export type Req = KeywordReq | AbilityReq;

export type HandledRequirement =
  | KeywordEquippedRequirement
  | DistinctKeywordItemsEquippedRequirement
  | KeywordWithLevelEquippedRequirement
  | AbilityAvailableRequirement;

export type RequirementCandidate = {
  slotName: string;
  slotKey: string;
  item: OptimiserItem;
};

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export const isHandledRequirement = (req: Requirement): req is HandledRequirement =>
  (handledReqTypes as ReadonlyArray<string>).includes(req.type);

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/** Normalises a handled requirement into the uniform `Req` shape. */
export const getReq = (req: HandledRequirement): Req => {
  if (req.type === "keywordEquipped") {
    return { keyword: req.requirement.keyword, quantity: 1, level: 1 };
  } else if (req.type === "distinctKeywordItemsEquipped") {
    return {
      keyword: req.requirement.keywords[0],
      quantity: req.requirement.quantity,
      level: 1,
    };
  } else if (req.type === "keywordWithLevelEquipped") {
    return {
      keyword: req.requirement.keyword,
      quantity: 1,
      level: req.requirement.level,
    };
  } else {
    // abilityAvailable
    return { ability: req.requirement.ability, quantity: 1, level: 1 };
  }
};

/** Returns 1 if `item` contributes toward satisfying `req`, 0 otherwise. */
export function contributesToReq(
  item: OptimiserItem | null | undefined,
  req: Req,
): 0 | 1 {
  if (!item) return 0;

  if ("keyword" in req) {
    if (!item.keywords?.includes(req.keyword)) return 0;
    if (req.level && (item.level ?? 1) < req.level) return 0;
    return 1;
  } else if ("ability" in req) {
    if (!item.abilities) return 0;
    const hasAbility = item.abilities.some((a) => {
      if (typeof a === "string") return a === req.ability;
      const { ability, unlockLevel } = a;
      return ability === req.ability && (item.quality ?? "common") >= unlockLevel;
    });
    return hasAbility ? 1 : 0;
  }

  return 0;
}

/** Filters `items` to those that can satisfy `req`. */
export const filterItemsForReq = (req: Req, items: OptimiserItem[]): OptimiserItem[] =>
  items.filter((item) => {
    if ("keyword" in req) {
      return (
        item.keywords?.includes(req.keyword) &&
        (req.level > 1
          ? Object.values(getLevelRequirementsMap(item.requirements))[0] >= req.level
          : true)
      );
    } else if ("ability" in req && item.abilities) {
      const itemAbilityNames = item.abilities
        .flatMap((abilityVal) => {
          if (typeof abilityVal === "string") return abilityVal;
          const { quality } = item;
          const { ability, unlockLevel } = abilityVal;
          return quality >= unlockLevel ? ability : null;
        })
        .filter((value): value is string => value !== null);
      return itemAbilityNames.includes(req.ability);
    }
    return false;
  });

/**
 * Expands `gearOptions` into a flat list of slot+item candidates that
 * contribute toward `req`, sorted by score (best first).
 *
 * `prio` must be the currently active optimiser priority string so the
 * function remains pure and store-free.
 */
export function getRequirementCandidates(
  gearOptions: Record<string, OptimiserItem[]>,
  req: Req,
  prio: string,
  level?: number,
): RequirementCandidate[] {
  const result: RequirementCandidate[] = [];

  for (const [slotKey, items] of Object.entries(gearOptions)) {
    const max = slotMax(slotKey, level);

    for (let i = 1; i <= max; i++) {
      const slotName = max > 1 ? `${slotKey}${i}` : slotKey;

      for (const item of items) {
        if (contributesToReq(item, req)) {
          result.push({ slotName, slotKey, item });
        }
      }
    }
  }

  return result.sort((a, b) =>
    isHighStat(prio)
      ? compareScore(b.item.score, a.item.score, prio)
      : compareScore(a.item.score, b.item.score, prio),
  );
}
