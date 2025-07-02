import { qualityOptions, consumableQualityOptions } from "@/utils/quality";
import { toDeepRaw } from "./rawData";

export const sumAttrs = (itemAttrs, qualityAttrs, buffs, quality) => {
  if (quality && quality.includes("consumable")) return sumBuffAttrs(buffs, quality);

  const qIndex = Math.min(
    qualityAttrs?.length || 0,
    qualityOptions.findIndex(({ value }) => value === quality)
  );

  const attrs = itemAttrs.map(toDeepRaw).map((attribute) => {
    return {
      ...attribute,
      stats: attribute.stats,
    };
  });

  for (let qi = 0; qi < qIndex; qi++) {
    const { attributes } = toDeepRaw(qualityAttrs[qi]);
    const statIds = attrs.map(({ stats }) => {
      return stats[0].stat;
    });

    attributes.forEach((attr) => {
      const stat = structuredClone(attr.stats)[0];
      const prev = statIds.findIndex((id) => id === stat.stat);
      const exists = prev >= 0;

      if (!exists) {
        attrs.push(attr);
        return;
      }

      const oldStat = attrs[prev].stats[0];
      oldStat.value = Math.round(100 * oldStat.value + 100 * stat.value) / 100;
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

  const [normal, _] = consumableQualityOptions.map(({ value }) => value);
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
