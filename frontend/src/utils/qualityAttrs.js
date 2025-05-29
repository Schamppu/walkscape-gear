import { qualityOptions } from "@/utils/quality";

export const sumAttrs = (itemAttrs, qualityAttrs, quality) => {
  const qIndex = qualityOptions.findIndex(({ value }) => value === quality);

  const attrs = [...itemAttrs.slice()].map((attribute) => {
    return {
      ...attribute,
      stats: attribute.stats,
    };
  });

  for (let qi = 0; qi < qIndex; qi++) {
    const { attributes } = qualityAttrs[qi];
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

      const oldStat = attrs[prev].stats[0]
      oldStat.value =
        Math.round(100 * oldStat.value + 100 * stat.value) / 100;
        oldStat.isNegative = oldStat.isNegative && oldStat.value < 0;
    });
  }

  return attrs;
};
