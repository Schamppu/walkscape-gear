import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { useDataStore } from "@/store/data";
import useBaseContext from "@/composables/context/useBaseContext";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { useSkillModifiers } from "./useSkillModifiers";
import { useRequirements } from "./useRequirements";
import { gearTypes, gearSlots } from "@/utils/createEmptyGearSet";
import { intersect } from "@/utils/intersect";
import { usedAttrs } from "@/utils/qualityAttrs";

export function useOptimiser() {
  const baseCtx = useBaseContext();
  const gearStore = useGearStore();
  const dataStore = useDataStore();

  const { showItemForActivity } = useShowItemForActivity(baseCtx);
  const { checkRequirements } = useRequirements(baseCtx);

  const getGearSetStats = (set) => {
    const gearCtx = {
      ...baseCtx,
      equippedGear: computed(() => [...Object.values(set).filter(Boolean)]),
    };

    const skills = useSkillModifiers(gearCtx);
    return skills.stepsPerRewardRoll.value;
  };

  const mapItemToStats = (item) => {
    const getAttrs = (item, quality) =>
      usedAttrs(item, quality)
        // TODO check with gear context
        .filter(({ requirements }) => checkRequirements(requirements, baseCtx))
        .flatMap(({ stats }) => stats[0]);

    if (item.gearType === "ring") {
      const q2 = baseCtx.ownedItems.value[item.id].quality2;
      const out = [
        { ...item, stats: getAttrs(item, item.quality) },
        {
          ...item,
          stats: getAttrs(item, q2 ? q2 : item.quality),
        },
      ];
      return out;
    } else {
      return {
        ...item,
        stats: getAttrs(item, item.quality),
      };
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
      _stats: normalizeStats(item.stats),
    }));

    return normalized
      .filter(
        (item, i) =>
          !normalized.some(
            (other, j) => i !== j && dominates(other._stats, item._stats),
          ),
      )
      .map(({ _stats, ...item }) => item);
  };

  const filterUsefulStats = (items, target = "stepsByRewardRoll") => {
    const baseStats = [
      "work_efficiency",
      "double_rewards",
      "double_action",
      "steps_required",
    ];
    const usefulStatsByTarget = {
      stepsByRewardRoll: baseStats,
    };

    const usefulStats = usefulStatsByTarget[target];
    return items.filter(
      ({ stats }) =>
        stats.filter(
          ({ stat, isNegative }) => !isNegative && usefulStats.includes(stat),
        ).length > 0,
    );
  };

  const getGearOptions = () => {
    const filterOwned = (item) => item.id in baseCtx.ownedItems.value;

    const filterItems = (items) =>
      items.filter((item) => {
        return filterOwned(item) && showItemForActivity(item);
      });

    const itemsBySlot = Object.fromEntries(
      gearTypes.map((slot) => {
        const items = Object.values(baseCtx.allGearItems.value).filter(
          ({ gearType, type, egg }) =>
            gearType === slot || type === slot || (slot === "pet" && egg),
        );

        const qualityItems = items.map((item) => {
          if (
            (!["crafted", "consumable"].includes(item.type) &&
              slot !== "pet") ||
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
        const mappedItems = filteredItems.flatMap(mapItemToStats);
        const upgradeFiltered = ["tool", "ring"].includes(slot)
          ? mappedItems
          : filterDirectUpgrades(mappedItems);
        const statFiltered = filterUsefulStats(upgradeFiltered);

        return [slot, statFiltered];
      }),
    );
    return itemsBySlot;
  };

  function greedyOptimize(gearSlots, gearOptions) {
    const gearSet = {};

    for (let slotIndex = 0; slotIndex < gearSlots.length; slotIndex++) {
      const slotName = gearSlots[slotIndex];
      const last = slotName.slice(-1);
      const slotKey = isNaN(last) ? slotName : slotName.slice(0, -1);

      const options = gearOptions[slotKey]?.length
        ? gearOptions[slotKey]
        : [null];

      const previousSlots = Object.entries(gearSet)
        .filter(([slot]) => slot.includes(slotKey))
        .map(([, item]) => {
          if (!item) return false;
          const { id, quality } = item;
          return options.findIndex(
            (item) => item.id === id && item.quality === quality,
          );
        });

      const filterMultislot = (opts) => {
        const filterBannedKeywords = (item) => {
          const otherSlotsItems = Object.entries(gearSet)
            .filter(
              ([slot, item]) =>
                item && slot !== slotName && slot.includes(slotKey),
            )
            .map(([, item]) => item);
          const equippedKeywords = otherSlotsItems.flatMap(
            (item) => item.keywords,
          );
          const bannedKeywords = equippedKeywords.flatMap(
            (keyword) => dataStore.keywordsMap[keyword]?.bannedKeywords || [],
          );
          const commonKeywords = intersect(item.keywords, bannedKeywords);
          return commonKeywords.length === 0;
        };

        return opts.filter(
          (item, index) =>
            !previousSlots.includes(index) && filterBannedKeywords(item),
        );
      };

      const filteredOptions = isNaN(last) ? options : filterMultislot(options);

      let bestItem = null;
      let bestScore = Infinity;

      for (const item of filteredOptions) {
        // Temporarily equip
        gearSet[slotName] = item;

        const score = getGearSetStats({ ...gearSet });

        if (score < bestScore) {
          bestScore = score;
          bestItem = item;
        }
      }

      // Lock in best item for this slot
      gearSet[slotName] = bestItem;
    }

    return gearSet;
  }

  const optimise = async () => {
    const options = getGearOptions();
    const set = greedyOptimize(gearSlots, options);
    console.log(set);
    await gearStore.equipMultiple(set, true);
  };

  return {
    optimise,
  };
}
