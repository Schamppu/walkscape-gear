/**
 * Purpose:
 * Pure function for computing the list of stat rows to display in StatsList.
 *
 * Responsibilities:
 * - Filter regular stat definitions to those present in effective attrs.
 * - Collect unique pseudo-stat rows from attrs whose stat ID is not a regular stat.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { DisplayStat, StatDefinition } from "@/domain/types/stat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatsListRow = {
  stat: DisplayStat;
  isPercent: boolean;
  data?: { skill: string; stat: string };
};

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Builds the ordered list of stat rows for display.
 *
 * Regular stats come first (ordered by `regularStatDefs`), followed by
 * deduplicated pseudo-stats extracted from attrs whose stat ID falls outside
 * the regular stat registry.
 *
 * @param allAttrs         Flat list of effective attribute entries.
 * @param regularStatDefs  Ordered stat definitions from the data store.
 */
export function buildStatsList(
  allAttrs: EffectiveAttrEntry[],
  regularStatDefs: StatDefinition[],
): StatsListRow[] {
  const attrStats = allAttrs.map(({ stats, customText, statText, skillText }) => ({
    ...stats[0],
    customText,
    statText,
    skillText,
  }));

  const regularStatIds = new Set(regularStatDefs.map(({ id }) => id));

  const regularRows: StatsListRow[] = regularStatDefs
    .flatMap((stat) => [
      { stat, isPercent: true },
      { stat, isPercent: false },
    ])
    .filter(({ stat, isPercent }) =>
      attrStats.some((a) => a.isPercent === isPercent && a.type === stat.type),
    );

  const seen = new Set<string>();
  const pseudoRows: StatsListRow[] = allAttrs
    .filter(({ stats }) => stats.some((s) => !regularStatIds.has(s.stat)))
    .map(({ stats, customIcon, customText, skillText, statText }) => {
      const { name, stat, isPercent } = stats[0];
      const emptyCustomText = !customText || customText === "";
      return {
        stat: {
          name: emptyCustomText ? name : customText,
          id: stat,
          type: stat,
          icon: customIcon ?? undefined,
        },
        isPercent,
        data: { skill: skillText, stat: statText },
      };
    })
    .filter(({ stat, isPercent }) => {
      const key = `${stat.id}:${isPercent}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return [...regularRows, ...pseudoRows];
}
