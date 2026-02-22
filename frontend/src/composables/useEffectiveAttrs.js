import { computed } from "vue";
import { useRequirements } from "./useRequirements";
import { useLevelBonus } from "./useLevelBonus";
import { usedAttrs } from "@/domain/quality/qualityAttrs";
import { toDeepRaw } from "../utils/rawData";
import { makePseudoStat } from "@/utils/domain/rollSpecialTable";

export function useEffectiveAttrs(ctx) {
  const { checkRequirements } = useRequirements(ctx);
  const { workEfficiencyBonus, qualityOutcomeBonus } = useLevelBonus(ctx);

  const allEquippedItems = computed(() => {
    const gearSet = ctx.equippedGear.value;

    const ownedCollectibles = ctx.ownedItemsByCategory("collectibles");

    return [...ownedCollectibles, ...gearSet]
      .map((item) => {
        return {
          ...item,
          attrs: toDeepRaw(usedAttrs(item, item.quality)),
        };
      })
      .filter(({ attrs }) => attrs.length);
  });

  const allAttrs = computed(() => {
    const mappedAttrs = allEquippedItems.value.flatMap((item) => {
      return item.attrs.map((attr) => {
        const stat =
          attr?.stats?.[0]?.type !== "rollSpecialTable"
            ? attr
            : makePseudoStat(attr);
        return { ...stat, item };
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
      checkRequirements(requirements, context),
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
    allAttrs,
    effectiveAttrs,
    totalsByStat,
  };
}
