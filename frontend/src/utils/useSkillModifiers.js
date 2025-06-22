import { computed } from "vue";
import { useEffectiveAttrs } from "./useEffectiveAttrs";
import { useActivityStore } from "../store/activity";

export function useSkillModifiers() {
  const activityStore = useActivityStore();
  const { effectiveAttrs, totalsByStat } = useEffectiveAttrs();

  const getStat = (stat, key = "percent") => {
    return stat in totalsByStat.value
      ? key in totalsByStat.value[stat]
        ? totalsByStat.value[stat][key]["sum"]
        : 0
      : 0;
  };

  const maxWorkEfficiency = computed(() => {
    return activityStore.activity?.maxWorkEfficiency || 1;
  });

  const workEfficiency = computed(() => {
    const workEfficiency = getStat("workEfficiency");
    return Math.min(workEfficiency, maxWorkEfficiency.value - 1);
  });

  const xpFlat = computed(() => {
    return getStat("bonusExperience", "flat");
  });

  const xpPercent = computed(() => {
    return getStat("bonusExperience", "percent");
  });

  const doubleAction = computed(() => {
    return getStat("doubleAction", "percent");
  });

  const doubleRewards = computed(() => {
    return getStat("doubleRewards", "percent");
  });

  const stepsPerCompletion = computed(() => {
    const { workRequired } = activityStore.activity || 0;
    if (!workRequired) return 0;
    const stepsRequired = getStat("stepsRequired", "flat");
    return Math.max(
      10,
      Math.ceil(workRequired / (1 + workEfficiency.value)) + stepsRequired
    );
  });

  const stepsPerAction = computed(() => {
    return stepsPerCompletion.value / (1 + doubleAction.value);
  });

  const stepsPerRewardRoll = computed(() => {
    return stepsPerAction.value / (1 + doubleRewards.value);
  });

  const xpRewards = computed(() => {
    const { xpRewardsMap } = activityStore.activity || null;
    if (!xpRewardsMap) return {};

    const xpRewardsArr = Object.entries(xpRewardsMap).map(([skill, base]) => {
      const value = (1 + xpPercent.value) * base + xpFlat.value;
      return {
        skill,
        base,
        value,
      };
    });

    if (xpRewardsArr.length > 1) {
      const totalBase = xpRewardsArr.reduce((sum, r) => sum + r.base, 0);
      const value = xpRewardsArr.reduce((sum, r) => sum + r.value, 0);
      xpRewardsArr.push({
        skill: "xp",
        base: totalBase,
        value,
      });
    }

    return xpRewardsArr;
  });

  const xpPerStep = computed(() => {
    return xpRewards.value.map(({ skill, value }) => {
      return {
        skill,
        value: value / stepsPerAction.value,
        displayedValue: value / stepsPerCompletion.value,
      };
    });
  });

  return {
    maxWorkEfficiency,
    workEfficiency,
    stepsPerCompletion,
    xpRewards,
    xpPerStep,
  };
}
