/**
 * Purpose:
 * Transforms a `rollSpecialTable` attribute into a pseudo-stat shape
 * by deriving the stat key and display name from its localization key.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs
 * - Mutate global state
 * - Perform network requests
 */

import { stripHtmlTags } from "@/utils/stripHtmlTags";
import type { Attribute, Stat } from "@/domain/types/item";

export function makePseudoStat(attr: Attribute): Attribute {
  const [baseStat] = attr.stats;
  if (!baseStat) return attr;

  const text = stripHtmlTags(attr.customText);
  const split = (attr.customTextLocalizationKey ?? "").split(".");
  const pseudoStat = split[split.length - 2];
  return {
    ...attr,
    statText: text,
    stats: [
      {
        ...baseStat,
        name: text,
        // Pseudo-stat keys are derived client-side from the localization key,
        // so they are not part of the API's stat enum.
        stat: pseudoStat as Stat["stat"],
        type: pseudoStat,
      } as Stat,
    ],
  };
}
