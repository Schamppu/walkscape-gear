/**
 * Purpose:
 * Pure comparator functions for sorting gear items.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs
 * - Mutate state
 * - Perform network requests
 */

import { qualityOptions } from "@/domain/constants/quality";
import type { ItemDetail } from "@/domain/types/item";
import type { SkillLevelRequirement } from "@/domain/types/requirement";

const qualityRank = Object.fromEntries(
  qualityOptions.map(({ value }, index) => [value, index]),
);

export function itemQualityNameSort(
  a: ItemDetail,
  b: ItemDetail,
  reverseQuality = false,
): number {
  const aRank = qualityRank[a.quality] ?? Infinity;
  const bRank = qualityRank[b.quality] ?? Infinity;

  if (aRank !== bRank) {
    return reverseQuality ? bRank - aRank : aRank - bRank;
  }

  return a.name.localeCompare(b.name);
}

export function levelReqNameSort(
  a: ItemDetail,
  b: ItemDetail,
  reverse = false,
): number {
  function getMaxSkillLevel(reqs: SkillLevelRequirement[]): number {
    if (!Array.isArray(reqs) || reqs.length === 0) return 0;
    const levels = reqs.map((r) => r.requirement.level);
    return levels.length ? Math.max(...levels) : 0;
  }

  const aLevel = getMaxSkillLevel(
    (a.requirements ?? []).filter(
      (r): r is SkillLevelRequirement => r.type === "skillLevel",
    ),
  );
  const bLevel = getMaxSkillLevel(
    (b.requirements ?? []).filter(
      (r): r is SkillLevelRequirement => r.type === "skillLevel",
    ),
  );

  if (aLevel !== bLevel) {
    return reverse ? bLevel - aLevel : aLevel - bLevel;
  }

  return a.name.localeCompare(b.name);
}
