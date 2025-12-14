import { computed } from "vue";
import { useRequirements } from "./useRequirements";
import { useLevelBonus } from "./useLevelBonus";
import { sumAttrs } from "../utils/qualityAttrs";
import { toDeepRaw } from "../utils/rawData";
import { stripHtmlTags } from "../utils/stripHtmlTags";

export function useEffectiveAttrs(ctx) {
  const { checkRequirements } = useRequirements(ctx);
  const { workEfficiencyBonus, qualityOutcomeBonus } = useLevelBonus(ctx);

  const collectibleIds = computed(() => {
    return Object.entries(ctx.itemsByCategory)
      .filter(([category]) => {
        return category.endsWith("collectibles");
      })
      .flatMap(([, items]) => items);
  });

  const allEquippedItems = computed(() => {
    const owned = ctx.ownedItems;
    const gearSet = ctx.equippedGear;

    const ownedCollectibles = collectibleIds.value.filter(
      ({ id }) => id in owned
    );

    return [...ownedCollectibles, ...gearSet]
      .map((item) => {
        return {
          ...item,
          attrs: toDeepRaw(
            item.type !== "loot"
              ? sumAttrs(
                  item.itemAttrs,
                  item.itemQualityAttrs,
                  item.buffs,
                  item.quality
                )
              : item.itemAttrs
          ),
        };
      })
      .filter(({ attrs }) => attrs.length);
  });

  const equippedKeywords = computed(() => {
    const gearSet = ctx.equippedGear;
    return gearSet
      .flatMap(({ keywords }) => keywords)
      .reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
  });

  const allAttrs = computed(() => {
    const mappedAttrs = allEquippedItems.value.flatMap((item) => {
      return item.attrs.map((attr) => {
        if (attr?.stats?.[0]?.type !== "rollSpecialTable") {
          return { ...attr, item };
        } else {
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
            item,
          };
        }
      });
    });
    if (workEfficiencyBonus.value) {
      mappedAttrs.push(workEfficiencyBonus.value);
    }
    if (qualityOutcomeBonus.value) {
      mappedAttrs.push(qualityOutcomeBonus.value);
    }
    if (ctx.service.value?.attributes.length) {
      const serviceAttrs = ctx.service.value.attributes.map((attr) => {
        return {
          ...attr,
          item: ctx.service.value,
        };
      });
      mappedAttrs.push.apply(mappedAttrs, serviceAttrs);
    }
    return mappedAttrs;
  });

  const effectiveAttrs = computed(() => effectiveAttrsWithContext(ctx));

  const effectiveAttrsWithContext = (context) => {
    return allAttrs.value.filter(({ requirements }) =>
      checkRequirements(requirements, context)
    );
  };

  const totalsByStatWithContext = (context) => {
    const totals = {};

    for (const attr of effectiveAttrsWithContext(context)) {
      for (const stat of attr.stats) {
        const { type, isPercent, value, isNegative } = stat;

        if (!(type in totals)) {
          totals[type] = {
            flat: {
              sum: 0,
              positive: 0,
              negative: 0,
            },
            percent: {
              sum: 0,
              positive: 0,
              negative: 0,
            },
          };
        }

        const key = isPercent ? "percent" : "flat";
        totals[type][key]["sum"] += value;
        totals[type][key][isNegative ? "negative" : "positive"] += value;
      }
    }

    return totals;
  };

  const totalsByStat = computed(() => totalsByStatWithContext(ctx));

  return {
    allEquippedItems,
    allAttrs,
    effectiveAttrs,
    effectiveAttrsWithContext,
    totalsByStatWithContext,
    equippedKeywords,
    totalsByStat,
  };
}
