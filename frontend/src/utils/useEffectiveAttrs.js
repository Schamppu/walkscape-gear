import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { checkRequirements } from "./requirements";
import { sumAttrs } from "./qualityAttrs";
import { toDeepRaw } from "./rawData";

export function useEffectiveAttrs() {
  const activity = useActivityStore();
  const gear = useGearStore();
  const items = useItemsStore();
  const player = usePlayerStore();

  const owned = items.ownedItems;
  const gearSet = gear.filledGearSlots;

  const allItems = computed(() => {
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

  const allAttrs = computed(() => {
    return allItems.value.flatMap((item) => {
      return item.attrs.map((attr) => {
        return { ...attr, item };
      });
    });
  });

  const effectiveAttrs = computed(() => {
    const data = {
      activity: activity.activity,
      location: activity.location,
      achievementPoints: player.achievementPoints,
      gear: gear.filledGearSlots,
    };

    return allAttrs.value.filter(({ requirements }) =>
      checkRequirements(requirements, data)
    );
  });

  return {
    allItems,
    allAttrs,
    effectiveAttrs,
  };
}
