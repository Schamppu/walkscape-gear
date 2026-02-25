/**
 * Purpose:
 * Pure gear-filtering utilities for the optimiser.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 */

import {
  getReq,
  contributesToReq,
  isHandledRequirement,
} from "@/domain/optimiser/requirements";
import type { HandledRequirement } from "@/domain/optimiser/requirements";
import type { OptimiserItem } from "@/domain/optimiser/types";
import type { LocationDetail } from "@/domain/types/location";
import type { Requirement } from "@/domain/types/common";
import type { Stat } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Source object shape required by `filterDirectUpgrades`. */
export type FilterSource = { requirements: Requirement[] } | null;

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * De-duplicates locations that share the same faction + keyword fingerprint,
 * keeping only the first occurrence of each combination.
 */
export const filterLocations = (locations: LocationDetail[]): LocationDetail[] => {
  const seen: Record<string, boolean> = {};
  return locations.filter((cur) => {
    const key = `${cur.faction}-${cur.keywords.join("-")}`;
    if (key in seen) return false;
    seen[key] = true;
    return true;
  });
};

/**
 * Removes items from `items` that are strictly dominated by another item in
 * the list (i.e. every stat of the dominated item is matched or exceeded by
 * the dominating item).
 *
 * When `source` is provided, keyword matching is also considered: an item is
 * never removed if it satisfies a requirement that the dominating item does not.
 */
export const filterDirectUpgrades = (
  items: OptimiserItem[],
  source: FilterSource = null,
): OptimiserItem[] => {
  function normalizeStats(stats: Stat[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of stats) {
      map.set(`${s.type}-${s.isPercent}`, s.value);
    }
    return map;
  }

  function dominates(a: Map<string, number>, b: Map<string, number>): boolean {
    let strictlyBetter = false;
    if (b.size === 0) return a.size > 0;

    for (const [type, bValue] of b) {
      const aValue = a.get(type);
      if (aValue === undefined) return false;
      if (Math.abs(aValue) < Math.abs(bValue)) return false;
      if (Math.abs(aValue) > Math.abs(bValue)) strictlyBetter = true;
    }

    if (a.size > b.size) strictlyBetter = true;
    return strictlyBetter;
  }

  function sameKeywords(a: OptimiserItem, b: OptimiserItem): boolean {
    if (!source) return true;

    const reqs = source.requirements
      .filter(isHandledRequirement)
      .map((req) => getReq(req as HandledRequirement));

    reqs.every((req) => {
      if (contributesToReq(b, req)) return contributesToReq(a, req);
      return true;
    });

    return true;
  }

  type NormalizedItem = OptimiserItem & { _stats: Map<string, number> };

  const normalized: NormalizedItem[] = items.map((item) => ({
    ...item,
    _stats: normalizeStats(item.usefulStats),
  }));

  return normalized
    .filter(
      (item, i) =>
        !normalized.some(
          (other, j) =>
            i !== j &&
            dominates(other._stats, item._stats) &&
            (!source || sameKeywords(other, item)),
        ),
    )
    .map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ _stats, ...item }) => item,
    );
};
