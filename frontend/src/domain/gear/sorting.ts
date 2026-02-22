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
import type { Requirement } from "@/domain/types/common";

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
  function getMaxSkillLevel(reqs: Requirement[]): number {
    if (!Array.isArray(reqs) || reqs.length === 0) return 0;
    const skillLevels = reqs
      .filter(
        (r) =>
          r.type === "skillLevel" &&
          r.requirement &&
          typeof (r.requirement as { level?: unknown }).level === "number",
      )
      .map((r) => (r.requirement as { level: number }).level);
    return skillLevels.length ? Math.max(...skillLevels) : 0;
  }

  const aLevel = getMaxSkillLevel(a.requirements);
  const bLevel = getMaxSkillLevel(b.requirements);

  if (aLevel !== bLevel) {
    return reverse ? bLevel - aLevel : aLevel - bLevel;
  }

  return a.name.localeCompare(b.name);
}
