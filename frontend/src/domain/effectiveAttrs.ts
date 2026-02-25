/**
 * Purpose:
 * Pure functions for assembling and aggregating effective attribute entries
 * from gear, level bonuses, and services.
 *
 * Responsibilities:
 * - Resolve usable attributes from a list of raw items.
 * - Collect attribute entries from all sources into a flat array.
 * - Accumulate per-stat totals from a list of entries.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any side effects.
 * - Mutate inputs.
 */

import { usedAttrs, type Attribute } from "@/domain/quality/qualityAttrs";
import { makePseudoStat } from "@/domain/gear/pseudoStat";
import type { ItemDetail } from "@/domain/types/item";
import type { ServiceDetail } from "@/domain/types/service";
import type { Requirement } from "@/domain/types/common";
import type { Stat } from "@/domain/types/item";
import type { LevelBonusAttr } from "@/domain/levelBonus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal shape of a single entry in the effective-attrs collection.
 * All three sources (gear, level-bonus, service) satisfy this interface.
 */
export type EffectiveAttrEntry = {
  requirements: Requirement[];
  stats: Stat[];
  item: { id: string; name: string; icon: string };
};

type StatBucket = {
  sum: number;
  positive: number;
  negative: number;
};

export type StatTotals = Record<
  string,
  { flat: StatBucket; percent: StatBucket }
>;

/** Intermediate shape: an item with its resolved usable attributes. */
type ResolvedItem = {
  id: string;
  name: string;
  icon: string;
  attrs: Attribute[];
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Maps a list of plain (non-reactive) `ItemDetail` objects to resolved items,
 * each annotated with the usable attributes for their current quality tier.
 * Items with no usable attributes are excluded.
 */
export function resolveItemAttrs(items: ItemDetail[]): ResolvedItem[] {
  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      attrs: usedAttrs(item, item.quality),
    }))
    .filter(({ attrs }) => attrs.length > 0);
}

/**
 * Assembles a flat list of `EffectiveAttrEntry` from all attribute sources:
 * equipped items (gear + collectibles), level-above-requirement bonuses, and
 * the selected service.
 */
export function buildAllAttrEntries(
  resolvedItems: ResolvedItem[],
  workEfficiencyBonus: LevelBonusAttr | null,
  qualityOutcomeBonus: LevelBonusAttr | null,
  service: ServiceDetail | null,
): EffectiveAttrEntry[] {
  const entries: EffectiveAttrEntry[] = resolvedItems.flatMap((item) =>
    item.attrs.map((attr: Attribute): EffectiveAttrEntry => {
      const stat =
        attr?.stats?.[0]?.type !== "rollSpecialTable"
          ? attr
          : makePseudoStat(attr);
      return { ...stat, item };
    }),
  );

  if (workEfficiencyBonus) {
    entries.push(workEfficiencyBonus);
  }

  if (qualityOutcomeBonus) {
    entries.push(qualityOutcomeBonus);
  }

  if (service?.attributes.length) {
    entries.push(
      ...service.attributes.map((attr) => ({ ...attr, item: service })),
    );
  }

  return entries;
}

/**
 * Accumulates per-stat flat and percent totals (positive, negative, and sum)
 * from a list of effective attr entries.
 */
export function calculateStatTotals(entries: EffectiveAttrEntry[]): StatTotals {
  const totals: StatTotals = {};

  for (const attr of entries) {
    for (const stat of attr.stats) {
      const { type, isPercent, value, isNegative } = stat;

      if (!(type in totals)) {
        totals[type] = {
          flat: { sum: 0, positive: 0, negative: 0 },
          percent: { sum: 0, positive: 0, negative: 0 },
        };
      }

      const key = isPercent ? "percent" : "flat";
      totals[type][key].sum += value;
      totals[type][key][isNegative ? "negative" : "positive"] += value;
    }
  }

  return totals;
}
