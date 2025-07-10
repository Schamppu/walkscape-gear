import { qualityOptions, consumableQualityOptions } from "@/utils/quality";
import { toDeepRaw } from "./rawData";

// Create a quality rank mapping for sorting
const qualityRank = Object.fromEntries(
  qualityOptions.map(({ value }, index) => [value, index])
);

export const sumAttrs = (itemAttrs, qualityAttrs, buffs, quality) => {
  if (quality && quality.includes("consumable"))
    return sumBuffAttrs(buffs, quality);

  const attrs = itemAttrs.map(toDeepRaw).map((attribute) => {
    return {
      ...attribute,
      stats: attribute.stats,
    };
  });

  if (!qualityAttrs || qualityAttrs.length === 0) return attrs;

  // Sort qualityAttrs according to qualityOptions order
  const sortedQualityAttrs = qualityAttrs.sort((a, b) => {
    const aRank = qualityRank[a.quality] ?? Infinity;
    const bRank = qualityRank[b.quality] ?? Infinity;
    return aRank - bRank;
  });
  const qIndex =
    sortedQualityAttrs?.findIndex(({ quality: q }) => q === quality) ?? 0;

  for (let qi = 0; qi <= qIndex; qi++) {
    const { attributes } = toDeepRaw(sortedQualityAttrs[qi]);
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

      const oldStat = attrs[prev].stats[0];
      oldStat.value =
        Math.round(10000 * oldStat.value + 10000 * stat.value) / 10000;
      oldStat.isNegative = oldStat.isNegative && oldStat.value < 0;
    });
  }

  return attrs;
};

export const sumBuffAttrs = (buffs, quality) => {
  const buffData = buffs.flatMap(({ data }) =>
    data.flatMap(({ buffs }) => buffs)
  );
  if (!buffData || buffData.length === 0) {
    return [];
  }

  const [normal] = consumableQualityOptions.map(({ value }) => value);
  const mapAttrs = (attribute) => {
    return {
      ...attribute,
      stats: attribute.stats,
    };
  };

  const attrs = buffData[0].attributes.map(mapAttrs);
  const fineAttrs = buffData[0].fineAttributes.map(mapAttrs);
  return quality === normal ? attrs : fineAttrs;
};
