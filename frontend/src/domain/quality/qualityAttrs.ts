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
  ConsumableItem,
  GearItem,
  Item,
  PetItem,
  QualityAttr,
} from "@/domain/types/item";

export type {
  Attribute,
  Buff,
  BuffData,
  BuffObj,
  ConsumableItem,
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

function isConsumable(item: Item): item is ConsumableItem {
  return "buffs" in item && Array.isArray(item.buffs) && item.buffs.length > 0;
}

/**
 * Deep-clones a value using JSON round-trip so it works with Vue reactive
 * proxy objects (which `structuredClone` rejects with a DOMException).
 * Safe for all plain JSON-serialisable game data.
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
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
  itemAttrs: Attribute[] | undefined,
  qualityAttrs: QualityAttr[] | undefined | null,
  buffs: Buff[] | null | undefined,
  quality: string,
): Attribute[] {
  if (quality && quality.includes("consumable")) {
    return sumBuffAttrs(buffs ?? [], quality);
  }

  const attrs: Attribute[] = (itemAttrs ?? [])
    .map((a) => deepClone(a))
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
    const { attributes } = deepClone(sortedQualityAttrs[qi]);
    const attrKey = (a: Attribute) => {
      const reqTypes = (a.requirements ?? [])
        .map((r) => r.type)
        .sort()
        .join("|");
      return `${a.stats[0].type}-${a.skillText}-${reqTypes}`;
    };
    const statIds = attrs.map(attrKey);

    attributes.forEach((attr) => {
      const stat = deepClone(attr.stats)[0];
      const key = attrKey(attr);
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
  const consumable = isConsumable(item);
  const getAttrs = (item: Item) => {
    if ("egg" in item) {
      const levelIndex = Number(quality) - 1;
      const levelAttrs = item.levels[levelIndex]?.attributes ?? [];
      // Ability attributes are attached upstream (composable layer) since the
      // pure layer has no store access; passive always, active unless toggled.
      const abilityAttrs = item.abilityAttrs ?? [];
      return [...levelAttrs, ...abilityAttrs];
    } else if ("materialAttrs" in item) {
      return item.materialAttrs ?? [];
    } else if ("itemAttrs" in item) {
      return (item as GearItem).itemAttrs ?? [];
    } else {
      return []; // ConsumableItem — buffs handled via sumBuffAttrs
    }
  };

  const attrs = getAttrs(item);
  const usedQuality = pet ? "common" : quality;
  const gearItem = pet || consumable ? undefined : (item as GearItem);
  const consumableItem = consumable ? item : undefined;

  return sumAttrs(
    attrs,
    gearItem?.itemQualityAttrs,
    consumableItem?.buffs,
    usedQuality,
  );
}
