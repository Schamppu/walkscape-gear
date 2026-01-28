import { useActivityStore } from "@/store/activity";
import useBaseContext from "@/composables/context/useBaseContext";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { useRequirements } from "@/composables/useRequirements";
import { useDataStore } from "@/store/data";
import { gearTypes } from "@/utils/createEmptyGearSet";
import { usedAttrs } from "@/utils/qualityAttrs";
import { intersect } from "@/utils/intersect";

import { getReq, handledReqTypes, contributesToReq } from "./requirements";
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

const filterLocations = (locations) => {
  const filtered = locations.reduce(
    (acc, cur) => {
      const key = `${cur.faction}-${cur.keywords.join("-")}`;
      if (key in acc.seen) return acc;
      acc.seen[key] = true;
      acc.locations.push(cur);
      return acc;
    },
    { locations: [], seen: {} },
  );

  return filtered.locations;
};

const filterDirectUpgrades = (items, source = null) => {
  function normalizeStats(stats) {
    const map = new Map();
    for (const s of stats) {
      map.set(`${s.type}-${s.isPercent}`, s.value);
    }
    return map;
  }

  function dominates(aStats, bStats) {
    let strictlyBetter = false;

    if (bStats.size === 0) {
      return aStats.size > 0;
    }

    for (const [type, bValue] of bStats) {
      const aValue = aStats.get(type);

      // Must have the stat
      if (aValue === undefined) return false;

      // Must be at least as good
      if (Math.abs(aValue) < Math.abs(bValue)) return false;

      // Better in a shared stat
      if (Math.abs(aValue) > Math.abs(bValue)) {
        strictlyBetter = true;
      }
    }

    // Extra stats in A count as strictly better
    if (aStats.size > bStats.size) {
      strictlyBetter = true;
    }

    return strictlyBetter;
  }

  function sameKeywords(a, b) {
    const reqs = source.requirements
      .filter(({ type }) => handledReqTypes.includes(type))
      .map(({ type, requirement }) => getReq({ type, requirement }));
    reqs.every((req) => {
      if (contributesToReq(b, req)) {
        return contributesToReq(a, req);
      }
      return true;
    });

    return true;
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
            (other, j) =>
              i !== j &&
              dominates(other._stats, item._stats) &&
              (!source || (!!source && sameKeywords(other, item))),
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
      if (slot === "location" && activityStore.locations) {
        return [
          slot,
          { required: [], primary: filterLocations(activityStore.locations) },
        ];
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

      const upgradeFiltered = ["ring"].includes(slot)
        ? scoredItems
        : filterDirectUpgrades(scoredItems);
      const statFiltered = filterUsefulStats(
        upgradeFiltered,
        selectedPriority(),
      );

      return [
        slot,
        {
          required:
            filterDirectUpgrades(keywordItems, baseCtx.source.value).concat(
              abilityItems,
            ) || [],
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
