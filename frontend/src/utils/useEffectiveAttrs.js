import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useRequirements } from "./useRequirements";
import { useLevelBonus } from "./useLevelBonus";
import { sumAttrs } from "./qualityAttrs";
import { toDeepRaw } from "./rawData";

const stripHtmlTags = (text) => {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "");
};

export function useEffectiveAttrs() {
  const { checkRequirements } = useRequirements();
  const { workEfficiencyBonus, craftingOutcomeBonus } = useLevelBonus();

  const activities = useActivityStore();
  const gear = useGearStore();
  const items = useItemsStore();

  const collectibleIds = computed(() => {
    return Object.entries(items.itemsByCategory)
      .filter(([category]) => {
        return category.endsWith("collectibles");
      })
      .flatMap(([, items]) => items);
  });

  const allEquippedItems = computed(() => {
    const owned = items.ownedItems;
    const gearSet = gear.equippedGear;

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
    const gearSet = gear.equippedGear;
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
    if (craftingOutcomeBonus.value) {
      mappedAttrs.push(craftingOutcomeBonus.value);
    }
    if (activities.service?.attributes.length) {
      const serviceAttrs = activities.service.attributes.map((attr) => {
        return {
          ...attr,
          item: activities.service,
        };
      });
      mappedAttrs.push.apply(mappedAttrs, serviceAttrs);
    }
    return mappedAttrs;
  });

  const effectiveAttrs = computed(() => {
    return allAttrs.value.filter(({ requirements }) =>
      checkRequirements(requirements)
    );
  });

  const totalsByStat = computed(() => {
    const totals = {};

    for (const attr of effectiveAttrs.value) {
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
  });

  return {
    allEquippedItems,
    allAttrs,
    effectiveAttrs,
    equippedKeywords,
    totalsByStat,
  };
}
