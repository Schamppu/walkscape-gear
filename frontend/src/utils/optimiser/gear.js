import { useActivityStore } from "@/store/activity";
import useBaseContext from "@/composables/context/useBaseContext";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { useRequirements } from "@/composables/useRequirements";
import { useDataStore } from "@/store/data";
import { gearTypes } from "@/utils/createEmptyGearSet";
import { usedAttrs } from "@/utils/qualityAttrs";
import { intersect } from "@/utils/intersect";

import { getGearSetStats, filterUsefulStats } from "./stats";
import { getItemScores } from "./score";
import { selectedPriority } from "./priority";

const mapItemToStats = (item, ctx) => {
  const { checkRequirements } = useRequirements(ctx);

  const getAttrs = (item, quality) => {
    const attrs = usedAttrs(item, quality);
    return {
      stats: attrs.flatMap(({ stats }) => stats[0]),
      usefulStats: attrs
        // TODO check with gear context
        .filter(({ requirements }) => checkRequirements(requirements, ctx))
        .flatMap(({ stats }) => stats[0]),
    };
  };

  const base = { ...item, ...getAttrs(item, item.quality) };
  if (item.gearType === "ring") {
    const q2 = ctx.ownedItems.value[item.id].quality2;
    const out = [
      base,
      {
        ...item,
        ...getAttrs(item, q2 ? q2 : item.quality),
      },
    ];
    return out;
  } else {
    return base;
  }
};

const filterDirectUpgrades = (items) => {
  function normalizeStats(stats) {
    const map = new Map();
    for (const s of stats) {
      map.set(`${s.type}-${s.isPercent}`, s.value);
    }
    return map;
  }

  function dominates(aStats, bStats) {
    let strictlyBetter = false;

    for (const [type, bValue] of bStats) {
      const aValue = aStats.get(type);

      // Must have the stat
      if (aValue === undefined) return false;

      // Must be at least as good
      if (Math.abs(aValue) < Math.abs(bValue)) return false;

      if (Math.abs(aValue) > Math.abs(bValue)) strictlyBetter = true;
    }

    return strictlyBetter;
  }

  const normalized = items.map((item) => ({
    ...item,
    _stats: normalizeStats(item.usefulStats),
  }));

  return (
    normalized
      .filter(
        (item, i) =>
          !normalized.some(
            (other, j) => i !== j && dominates(other._stats, item._stats),
          ),
      )
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _stats, ...item }) => item)
  );
};

export const filterMultislot = (gearSet, opts, slotKey, slotName) => {
  const dataStore = useDataStore();
  const previousSlots = Object.entries(gearSet)
    .filter(([slot]) => slot.includes(slotKey))
    .map(([, item]) => {
      if (!item) return false;
      const { id, quality } = item;
      return opts.findIndex(
        (item) => item.id === id && item.quality === quality,
      );
    });

  const filterBannedKeywords = (item) => {
    const otherSlotsItems = Object.entries(gearSet)
      .filter(
        ([slot, item]) => item && slot !== slotName && slot.includes(slotKey),
      )
      .map(([, item]) => item);
    const equippedKeywords = otherSlotsItems.flatMap((item) => item.keywords);
    const bannedKeywords = equippedKeywords.flatMap(
      (keyword) => dataStore.keywordsMap[keyword]?.bannedKeywords || [],
    );
    const commonKeywords = intersect(item.keywords, bannedKeywords);
    return commonKeywords.length === 0;
  };

  return opts.filter((item, index) => {
    return !previousSlots.includes(index) && filterBannedKeywords(item);
  });
};

export const getGearOptions = () => {
  const activityStore = useActivityStore();
  const baseCtx = useBaseContext();
  const { showItemForActivity, usefulKeywords, usefulAbilities } =
    useShowItemForActivity(baseCtx);
  const filterOwned = (item) => item.id in baseCtx.ownedItems.value;

  const filterItems = (items) =>
    items.filter((item) => {
      return filterOwned(item) && showItemForActivity(item);
    });

  const baseScore = getGearSetStats({});

  const itemsBySlot = Object.fromEntries(
    gearTypes.map((slot) => {
      if (slot === "location" && baseCtx.activitySelected.value) {
        return [slot, { required: [], primary: activityStore.locations }];
      }

      const items = Object.values(baseCtx.allGearItems.value).filter(
        ({ gearType, type, egg }) =>
          gearType === slot || type === slot || (slot === "pet" && egg),
      );

      const qualityItems = items.map((item) => {
        if (
          (!["crafted", "consumable"].includes(item.type) && slot !== "pet") ||
          !(item.id in baseCtx.ownedItems.value)
        ) {
          return item;
        } else if (item.id in baseCtx.ownedItems.value) {
          const owned = baseCtx.ownedItems.value[item.id];
          return {
            ...item,
            quality: owned.quality,
            quality2: owned.quality2,
          };
        }
      });

      const filteredItems = filterItems(qualityItems);
      const mappedItems = filteredItems.flatMap((item) =>
        mapItemToStats(item, baseCtx),
      );
      const scoredItems = getItemScores(slot, mappedItems, baseScore);

      const keywordItems = scoredItems.filter(
        (item) => usefulKeywords(item, baseCtx.activity.value, null).length > 0,
      );
      const abilityItems = scoredItems.filter(
        (item) => usefulAbilities(item, baseCtx.activity.value).length > 0,
      );

      const upgradeFiltered = ["tool", "ring"].includes(slot)
        ? scoredItems
        : filterDirectUpgrades(scoredItems);
      const statFiltered = filterUsefulStats(
        upgradeFiltered,
        selectedPriority(baseCtx),
      );

      return [
        slot,
        {
          required: keywordItems.concat(abilityItems) || [],
          primary: statFiltered || [],
        },
      ];
    }),
  );
  return itemsBySlot;
};

export const getItemOptions = (options, key) =>
  Object.fromEntries(
    Object.entries(options).map(([slot, items]) => [slot, items[key]]),
  );

export const slotMax = (slotName) => {
  if (slotName === "tool") return 6;
  if (slotName === "ring") return 2;
  return 1;
};
