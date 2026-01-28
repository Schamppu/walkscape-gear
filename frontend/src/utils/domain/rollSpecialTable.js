import { stripHtmlTags } from "@/utils/stripHtmlTags";

export function makePseudoStat(attr) {
  const text = stripHtmlTags(attr.customText);
  const split = attr.customTextLocalizationKey.split(".");
  const pseudoStat = split[split.length - 2];
  return {
    ...attr,
    statText: text,
    stats: [
      {
        ...attr.stats[0],
        name: text,
        stat: pseudoStat,
        type: pseudoStat,
      },
    ],
  };
}
