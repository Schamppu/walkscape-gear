import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGearStore } from "@/store/gear";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import useBaseContext from "@/composables/context/useBaseContext";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { useSkillModifiers } from "./useSkillModifiers";
import { useRequirements } from "./useRequirements";
import { optimiserPriorities } from "@/constants/optimizerPriorities";
import { gearTypes, gearSlots } from "@/utils/createEmptyGearSet";
import { intersect } from "@/utils/intersect";
import { usedAttrs } from "@/utils/qualityAttrs";

export function useOptimiser() {
  const baseCtx = useBaseContext();
  const gearStore = useGearStore();
  const dataStore = useDataStore();

  const settingsStore = useSettingsStore();
  const { gearSettings } = storeToRefs(settingsStore);

  const { showItemForActivity, usefulKeywords, usefulAbilities } =
    useShowItemForActivity(baseCtx);
  const { checkRequirements, getLevelRequirementsMap } =
    useRequirements(baseCtx);

  const selectedPriority = () => {
    return optimiserPriorities[gearSettings.value.optimiserPriority.display]
      .value;
  };

  const getGearSetStats = (set) => {
    const gearCtx = {
      ...baseCtx,
      equippedGear: computed(() => [...Object.values(set).filter(Boolean)]),
    };

    const stats = useSkillModifiers(gearCtx);

    const prio = selectedPriority();
    if (prio === "stepsPerRewardRoll") return stats.stepsPerRewardRoll.value;
    else if (prio === "xpPerStep") {
      const xp = stats.xpPerStep.value;
      return xp[xp.length - 1].value;
    }
  };

  const mapItemToStats = (item) => {
    const getAttrs = (item, quality) => {
      const attrs = usedAttrs(item, quality);
      return {
        stats: attrs.flatMap(({ stats }) => stats[0]),
        usefulStats: attrs
          // TODO check with gear context
          .filter(({ requirements }) =>
            checkRequirements(requirements, baseCtx),
          )
          .flatMap(({ stats }) => stats[0]),
      };
    };

    const base = { ...item, ...getAttrs(item, item.quality) };
    if (item.gearType === "ring") {
      const q2 = baseCtx.ownedItems.value[item.id].quality2;
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

  const getItemScores = (slot, items, baseScore) => {
    return items.map((item) => ({
      ...item,
      score: compareScore(getGearSetStats({ [slot]: item }), baseScore),
    }));
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

  const filterUsefulStats = (items, target = "stepsPerRewardRoll") => {
    const baseStats = ["work_efficiency", "double_action", "steps_required"];
    const usefulStatsByTarget = {
      stepsPerRewardRoll: [...baseStats, "double_rewards"],
      xpPerStep: [...baseStats, "bonus_experience"],
    };

    const targetStats = usefulStatsByTarget[target];
    return items.filter(
      ({ usefulStats }) =>
        usefulStats.filter(
          ({ stat, isNegative }) => !isNegative && targetStats.includes(stat),
        ).length > 0,
    );
  };

  const filterMultislot = (gearSet, opts, slotKey, slotName) => {
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

  const getGearOptions = () => {
    const filterOwned = (item) => item.id in baseCtx.ownedItems.value;

    const filterItems = (items) =>
      items.filter((item) => {
        return filterOwned(item) && showItemForActivity(item);
      });

    const baseScore = getGearSetStats({});

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
        const scoredItems = getItemScores(slot, mappedItems, baseScore);

        const keywordItems = scoredItems.filter(
          (item) =>
            usefulKeywords(item, baseCtx.activity.value, null).length > 0,
        );
        const abilityItems = scoredItems.filter(
          (item) => usefulAbilities(item, baseCtx.activity.value).length > 0,
        );

        const upgradeFiltered = ["tool", "ring"].includes(slot)
          ? scoredItems
          : filterDirectUpgrades(scoredItems);
        const statFiltered = filterUsefulStats(
          upgradeFiltered,
          selectedPriority(),
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

  const getItemOptions = (options, key) =>
    Object.fromEntries(
      Object.entries(options).map(([slot, items]) => [slot, items[key]]),
    );

  const startScore = () => {
    const prio = selectedPriority();
    if (prio === "stepsPerRewardRoll") return Infinity;
    if (prio === "xpPerStep") return -Infinity;
  };

  const compareScore = (value, best) => {
    const prio = selectedPriority();
    if (prio === "stepsPerRewardRoll") return best - value;
    if (prio === "xpPerStep") return value - best;
  };

  const getReq = ({ type, requirement }) => {
    if (type === "keywordEquipped") {
      return {
        keyword: requirement.keyword,
        quantity: 1,
        level: 1,
      };
    } else if (type === "distinctKeywordItemsEquipped") {
      return {
        keyword: requirement.keywords[0],
        quantity: requirement.quantity,
        level: 1,
      };
    } else if (type === "keywordWithLevelEquipped") {
      return {
        keyword: requirement.keyword,
        quantity: 1,
        level: requirement.level,
      };
    } else if (type === "abilityAvailable") {
      return {
        ability: requirement.ability,
        quantity: 1,
        level: 1,
      };
    }
  };

  function contributesToReq(item, req) {
    if (!item) return 0;

    if ("keyword" in req) {
      if (!item.keywords.includes(req.keyword)) return 0;
      if (req.level && item.level < req.level) return 0;

      return 1;
    } else if ("ability" in req) {
      return 1;
    }
  }

  const filterItemsForReq = (req, items) => {
    return items.filter((item) => {
      if ("keyword" in req) {
        return (
          item.keywords?.includes(req.keyword) &&
          (req.level > 1
            ? Object.values(getLevelRequirementsMap(item.requirements))[0] >
              req.level
            : true)
        );
      } else if ("ability" in req && "abilities" in item) {
        const itemAbilityNames = item.abilities
          .flatMap((abilityVal) => {
            if (typeof abilityVal === "string") return abilityVal;
            const { quality } = item;
            const { ability, unlockLevel } = abilityVal;
            return quality >= unlockLevel ? ability : null;
          })
          .filter((value) => value);
        return itemAbilityNames.includes(req.ability);
      }
    });
  };

  function requirementsFill(gearOptions) {
    const reqs = baseCtx.activity.value.requirements;
    let candidates = [{ gearSet: {}, score: startScore(), slotCounts: {} }];
    const requiredOptions = getItemOptions(gearOptions, "required");

    const handledReqTypes = [
      "distinctKeywordItemsEquipped",
      "keywordEquipped",
      "keywordWithLevelEquipped",
      "abilityAvailable",
    ];

    reqs.forEach((requirement) => {
      if (!handledReqTypes.includes(requirement.type)) return;
      let next = [];

      const req = getReq(requirement);

      const filteredGearSlots = Object.fromEntries(
        Object.entries(requiredOptions)
          .map(([slot, items]) => [slot, filterItemsForReq(req, items)])
          .filter(([, value]) => value.length),
      );
      candidates.forEach((candidate) => {
        next = next.concat(reqsBeamSearch(candidate, filteredGearSlots, req));
      });

      const newCandidates = next
        .sort((a, b) => compareScore(b.score, a.score))
        .slice(0, 3);
      candidates = newCandidates.length ? newCandidates : candidates;
    });
    return candidates;
  }

  const slotMax = (slotName) => {
    if (slotName === "tool") return 6;
    if (slotName === "ring") return 2;
    return 1;
  };

  function getRequirementCandidates(gearOptions, req) {
    const result = [];

    for (const [slotKey, items] of Object.entries(gearOptions)) {
      const max = slotMax(slotKey);

      for (let i = 1; i <= max; i++) {
        const slotName = max > 1 ? `${slotKey}${i}` : slotKey;

        for (const item of items) {
          if (contributesToReq(item, req)) {
            result.push({ slotName, slotKey, item });
          }
        }
      }
    }

    return result.sort((a, b) => compareScore(a.item.score, b.item.score));
  }

  function reqsBeamSearch(baseCandidate, gearOptions, req) {
    const BEAM_WIDTH = 3;
    const { gearSet, slotCounts } = baseCandidate;
    let candidates = [
      { gearSet, score: startScore(), slotCounts, fulfilled: 0 },
    ];

    const candidatesPool = getRequirementCandidates(gearOptions, req);
    console.log("candidatesPool", candidatesPool);

    for (const { slotName, slotKey, item } of candidatesPool) {
      const next = [];

      for (const { gearSet, fulfilled, slotCounts } of candidates) {
        // Skip if slot already used
        if (gearSet[slotName]) continue;

        // Skip if requirement already fulfilled
        if (fulfilled >= req.quantity) continue;

        const newSet = {
          ...gearSet,
          [slotName]: item,
        };

        const newFulfilled = fulfilled + 1;
        const score = getGearSetStats(newSet);
        const prevCount = slotKey in slotCounts ? slotCounts[slotKey] : 0;
        const newSlotCount = { ...slotCounts, [slotName]: prevCount + 1 };

        next.push({
          gearSet: newSet,
          fulfilled: newFulfilled,
          score,
          slotCounts: newSlotCount,
        });
      }

      // console.log(req);
      // console.log(next);

      candidates = candidates
        .concat(next)
        .sort((a, b) => {
          // Prefer fulfilled
          if (a.fulfilled !== b.fulfilled) {
            return b.fulfilled - a.fulfilled;
          }
          // Prefer fewer slots used
          const slotsA = Object.keys(a.gearSet).length;
          const slotsB = Object.keys(b.gearSet).length;
          if (slotsA !== slotsB) {
            return slotsA - slotsB;
          }
          return compareScore(b.score, a.score);
        })
        .slice(0, BEAM_WIDTH);
    }

    return candidates.filter((c) => c.fulfilled >= req.quantity);
  }

  function beamSearch(baseCandidate, gearSlots, gearOptions) {
    const BEAM_WIDTH = 3;
    let candidates = [baseCandidate];

    for (const slotName of gearSlots) {
      // Skip slots already filled by requirements
      if (baseCandidate.gearSet[slotName]) {
        continue;
      }

      const slotKey = slotName.replace(/\d+$/, "");
      const options = gearOptions[slotKey]?.length ? gearOptions[slotKey] : [];

      const next = [];

      for (const candidate of candidates) {
        const filteredOptions = ["ring", "tool"].includes(slotKey)
          ? filterMultislot(candidate.gearSet, options, slotKey, slotName)
          : options;

        for (const item of filteredOptions) {
          const newSet = {
            ...candidate.gearSet,
            [slotName]: item,
          };

          const score = getGearSetStats(newSet);

          next.push({
            gearSet: newSet,
            score,
          });
        }
      }

      const newCandidates = next
        .sort((a, b) => compareScore(b.score, a.score))
        .slice(0, BEAM_WIDTH);
      candidates = newCandidates.length ? newCandidates : candidates;
    }

    return candidates;
  }

  function gearFill(gearSlots, baseCandidates, gearOptions, gearKey) {
    let candidates = baseCandidates.length
      ? baseCandidates
      : [{ gearSet: {}, score: startScore(), slotCounts: {} }];

    candidates.forEach((candidate) => {
      const remainingGearOptions = Object.fromEntries(
        Object.entries(getItemOptions(gearOptions, gearKey)).filter(
          ([slot]) =>
            !(
              slot in candidate.slotCounts &&
              candidate.slotCounts[slot] >= slotMax(slot)
            ),
        ),
      );

      const searchResult = beamSearch(
        candidate,
        gearSlots,
        remainingGearOptions,
      );
      candidates = candidates.concat(searchResult);
    });

    return candidates
      .sort((a, b) => compareScore(b.score, a.score))
      .slice(0, 3);
  }

  const optimise = async () => {
    const options = getGearOptions();

    const reqSets = requirementsFill(options);
    const primarySets = gearFill(gearSlots, reqSets, options, "primary");

    const [usedSet] = primarySets;

    await gearStore.unequipAll();
    await gearStore.equipMultiple(usedSet.gearSet, true);
  };

  return {
    optimise,
  };
}
