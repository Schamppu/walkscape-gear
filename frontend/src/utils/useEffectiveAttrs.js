import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { useRequirements } from "./useRequirements";
import { sumAttrs } from "./qualityAttrs";
import { toDeepRaw } from "./rawData";

export function useEffectiveAttrs() {
  const { checkRequirements } = useRequirements();
  const gear = useGearStore();
  const items = useItemsStore();

  const allEquippedItems = computed(() => {
    const owned = items.ownedItems;
    const gearSet = gear.filledGearSlots;

    const ownedCollectibles =
      "collectibles" in items.itemsByCategory
        ? items.itemsByCategory["collectibles"].filter(({ id }) => id in owned)
        : [];

    return [...ownedCollectibles, ...gearSet]
      .map((item) => {
        return {
          ...item,
          attrs: toDeepRaw(
            item.type === "crafted"
              ? sumAttrs(item.itemAttrs, item.itemQualityAttrs, item.quality)
              : item.itemAttrs
          ),
        };
      })
      .filter(({ attrs }) => attrs.length);
  });

  const equippedKeywords = computed(() => {
    const gearSet = gear.filledGearSlots;
    return gearSet
      .flatMap(({ keywords }) => keywords)
      .reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
  });

  const allAttrs = computed(() => {
    return allEquippedItems.value.flatMap((item) => {
      return item.attrs.map((attr) => {
        return { ...attr, item };
      });
    });
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
        const { type, isPercent, value } = stat;

        if (!(type in totals)) {
          totals[type] = { flat: 0, percent: 0 };
        }

        const key = isPercent ? "percent" : "flat";
        totals[type][key] += value;
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
