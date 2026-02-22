/**
 * Purpose:
 * Pure calculation of effective item attributes, accounting for quality tiers
 * and consumable buff data.
 *
 * Responsibilities:
 * - Accumulate base item attributes with quality-tier bonus attributes up to
 *   and including the item's current quality level.
 * - Return buff attributes for consumable items based on normal/fine quality.
 * - Provide a single entry-point (`usedAttrs`) that handles gear, consumables
 *   and pets uniformly.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Mutate the caller's data (deep-clones inputs before mutation).
 */

import {
  qualityOptions,
  consumableQualityOptions,
} from "@/domain/constants/quality";
import type {
  Attribute,
  Buff,
  GearItem,
  Item,
  PetItem,
  QualityAttr,
  Stat,
  BuffObj,
  BuffData,
  PetLevel,
} from "@/domain/types/item";

export type {
  Attribute,
  Buff,
  BuffData,
  BuffObj,
  GearItem,
  Item,
  PetItem,
  PetLevel,
  QualityAttr,
  Stat,
} from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPet(item: Item): item is PetItem {
  return "egg" in item;
}

// Pre-compute rank lookup so callers don't pay the cost on every invocation.
const qualityRank = Object.fromEntries(
  qualityOptions.map(({ value }, index) => [value, index]),
);

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Accumulates `itemAttrs` with all quality-tier bonus attributes up to and
 * including the tier matching `quality`.  Handles consumable items by
 * delegating to `sumBuffAttrs`.
 */
export function sumAttrs(
  itemAttrs: Attribute[],
  qualityAttrs: QualityAttr[] | undefined | null,
  buffs: Buff[] | null | undefined,
  quality: string,
): Attribute[] {
  if (quality && quality.includes("consumable")) {
    return sumBuffAttrs(buffs ?? [], quality);
  }

  const attrs: Attribute[] = itemAttrs
    .map((a) => structuredClone(a))
    .map((attribute) => ({
      ...attribute,
      stats: attribute.stats,
    }));

  if (!qualityAttrs || qualityAttrs.length === 0) return attrs;

  // Sort quality tiers according to the canonical qualityOptions order.
  const sortedQualityAttrs = [...qualityAttrs].sort((a, b) => {
    const aRank = qualityRank[a.quality] ?? Infinity;
    const bRank = qualityRank[b.quality] ?? Infinity;
    return aRank - bRank;
  });

  const qIndex =
    sortedQualityAttrs.findIndex(({ quality: q }) => q === quality) ?? 0;

  for (let qi = 0; qi <= qIndex; qi++) {
    const { attributes } = structuredClone(sortedQualityAttrs[qi]);
    const statIds = attrs.map(({ stats, skillText }) => {
      return `${stats[0].type}-${skillText}`;
    });

    attributes.forEach((attr) => {
      const stat = structuredClone(attr.stats)[0];
      const key = `${stat.type}-${attr.skillText}`;
      const prev = statIds.findIndex((id) => id === key);
      const exists = prev >= 0;

      if (!exists) {
        attrs.push(attr);
        return;
      }

      const getSign = (val: number) => val >= 0;
      const oldStat = attrs[prev].stats[0];
      const previousSign = getSign(oldStat.value);

      oldStat.value =
        Math.round(10000 * oldStat.value + 10000 * stat.value) / 10000;
      oldStat.isNegative =
        getSign(oldStat.value) === previousSign
          ? oldStat.isNegative
          : !oldStat.isNegative;
    });
  }

  return attrs;
}

/**
 * Returns the effective attributes for a consumable item.
 * Normal quality returns the base buff attributes; any fine quality returns
 * the fine buff attributes.
 */
export function sumBuffAttrs(buffs: Buff[], quality: string): Attribute[] {
  const buffData = buffs.flatMap(({ data }) =>
    data.flatMap(({ buffs }) => buffs),
  );
  if (!buffData || buffData.length === 0) {
    return [];
  }

  const [normal] = consumableQualityOptions.map(({ value }) => value);
  const mapAttrs = (attribute: Attribute): Attribute => ({
    ...attribute,
    stats: attribute.stats,
  });

  const attrs = buffData[0].attributes.map(mapAttrs);
  const fineAttrs = buffData[0].fineAttributes.map(mapAttrs);
  return quality === normal ? attrs : fineAttrs;
}

/**
 * Returns the effective attributes for any item (gear, consumable, or pet).
 *
 * - For pets: `quality` is the numeric level (as a string, e.g. "1").
 * - For consumables: `quality` is a consumable quality string
 *   (e.g. "consumableCommon").
 * - For gear: `quality` is a standard quality string (e.g. "common").
 */
export function usedAttrs(item: Item, quality: string): Attribute[] {
  const pet = isPet(item);
  const attrs = pet
    ? Number(quality) > 0
      ? item.levels[Number(quality) - 1].attributes
      : []
    : item.itemAttrs;

  const usedQuality = pet ? "common" : quality;
  const gearItem = pet ? undefined : (item as GearItem);

  return sumAttrs(
    attrs,
    gearItem?.itemQualityAttrs,
    gearItem?.buffs,
    usedQuality,
  );
}
