/**
 * Purpose:
 * Pure gear-filtering utilities for the optimiser.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 */

import type { OptimiserItem } from "@/domain/optimiser/types";
import type { LocationDetail } from "@/domain/types/location";
import type { Stat } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * De-duplicates locations that share the same faction + keyword fingerprint,
 * keeping only the first occurrence of each combination.
 */
export const filterLocations = (
  locations: LocationDetail[],
): LocationDetail[] => {
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
 * the list. Item `a` dominates item `b` (and `b` is removed) when:
 *   1. `a` has every stat that `b` has, with values >= `b`'s values.
 *   2. At least one of `a`'s stat values is strictly greater than `b`'s.
 *
 * Edge case: an item with zero stats is dominated by anything that has at
 * least one stat (conditions hold vacuously; condition 2 is satisfied by
 * `a` having any stat at all).
 *
 * Keywords are intentionally NOT considered here — they are only meaningful
 * when evaluating requirement fulfilment, which is handled separately in the
 * requirements-fill phase before this function is called.
 */
export const filterDirectUpgrades = (
  items: OptimiserItem[],
): OptimiserItem[] => {
  function normalizeStats(stats: Stat[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of stats) {
      map.set(`${s.stat}-${s.isPercent}`, s.value);
    }
    return map;
  }

  type NormalizedItem = OptimiserItem & { _stats: Map<string, number> };

  function dominates(a: NormalizedItem, b: NormalizedItem): boolean {
    // Edge case: b has no stats — dominated by anything with at least one stat.
    if (b._stats.size === 0) return a._stats.size > 0;

    // Condition 1 – a must have every stat b has with equal-or-better value.
    for (const [key, bValue] of b._stats) {
      const aValue = a._stats.get(key);
      if (aValue === undefined) return false;
      if (Math.abs(aValue) < Math.abs(bValue)) return false;
    }

    // Condition 2 – at least one of a's stats must be strictly greater.
    return [...b._stats].some(([key, bValue]) => {
      const aValue = a._stats.get(key)!;
      return Math.abs(aValue) > Math.abs(bValue);
    });
  }

  const normalized: NormalizedItem[] = items.map((item) => ({
    ...item,
    _stats: normalizeStats(item.stats),
  }));

  return normalized
    .filter(
      (item, i) =>
        !normalized.some((other, j) => i !== j && dominates(other, item)),
    )
    .map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ _stats, ...item }) => item,
    );
};
