import { computed } from "vue";
import { useEffectiveAttrs } from "./useEffectiveAttrs";
import { useActivityStore } from "../store/activity";

export function useSkillModifiers(totals = {}) {
  const activityStore = useActivityStore();
  const { totalsByStat } = useEffectiveAttrs();

  const isActivity = computed(() => activityStore.activitySelected);
  const activity = computed(() => {
    if (!activityStore.activitySelected && !activityStore.recipeSelected)
      return null;
    return isActivity.value ? activityStore.activity : activityStore.recipe;
  });

  const getStat = (stat, key = "percent") => {
    const source = { ...totalsByStat.value, ...totals };
    return stat in source
      ? key in source[stat]
        ? source[stat][key]["sum"]
        : 0
      : 0;
  };

  const maxWorkEfficiency = computed(() => {
    return activity.value?.maxWorkEfficiency || 1;
  });

  const effectiveMaxWorkEfficiency = computed(() => {
    const { workRequired } = activity.value || 1;
    const minSteps = Math.ceil(workRequired / maxWorkEfficiency.value);
    return workRequired / minSteps;
  });

  const workEfficiency = computed(() => {
    const workEfficiency = getStat("workEfficiency");
    return Math.min(workEfficiency, maxWorkEfficiency.value - 1);
  });

  const uncappedWorkEfficiency = computed(() => {
    return getStat("workEfficiency");
  });

  const xpFlat = computed(() => {
    return getStat("bonusExperience", "flat");
  });

  const xpPercent = computed(() => {
    return getStat("bonusExperience", "percent");
  });

  const doubleAction = computed(() => {
    return Math.min(1, getStat("doubleAction", "percent"));
  });

  const doubleRewards = computed(() => {
    return Math.min(1, getStat("doubleRewards", "percent"));
  });

  const noMaterialsConsumed = computed(() => {
    return Math.min(1, getStat("noMaterialsConsumed", "percent"));
  });

  const findCollectibles = computed(() => {
    return 1 + getStat("findCollectibles", "percent");
  });

  const findGems = computed(() => {
    return 1 + getStat("findGems", "percent");
  });

  const findBirdNests = computed(() => {
    return 1 + getStat("findBirdNests", "percent");
  });

  const fineMaterialFind = computed(() => {
    return (1 + getStat("fineMaterialFind", "percent")) / 100;
  });

  const chestFind = computed(() => {
    return 1 + getStat("chestFind", "percent");
  });

  const qualityOutcome = computed(() => {
    return getStat("qualityOutcome", "flat");
  });

  const stepsRequiredFlat = computed(() => {
    return getStat("stepsRequired", "flat");
  });

  const stepsRequiredPercent = computed(() => {
    return 1 + getStat("stepsRequired", "percent");
  });

  const uncappedStepsPerCompletion = computed(() => {
    const { workRequired } = activity.value || 0;
    if (!workRequired) return 0;
    return (
      Math.ceil(
        (workRequired / (1 + workEfficiency.value)) * stepsRequiredPercent.value
      ) + stepsRequiredFlat.value
    );
  });

  const stepsPerCompletion = computed(() => {
    return Math.max(10, uncappedStepsPerCompletion.value);
  });

  const stepsPerAction = computed(() => {
    return stepsPerCompletion.value / (1 + doubleAction.value);
  });

  const stepsPerRewardRoll = computed(() => {
    return stepsPerAction.value / (1 + doubleRewards.value);
  });

  const craftsPerMaterial = computed(() => {
    return (1 + doubleRewards.value) / (1 - noMaterialsConsumed.value);
  });

  const xpRewards = computed(() => {
    const xpRewardsMap = isActivity.value
      ? activity.value.xpRewardsMap
      : activity.value.xpRewards;
    if (!xpRewardsMap) return {};

    const xpRewardsArr = Object.entries(xpRewardsMap).map(([skill, base]) => {
      const value = (1 + xpPercent.value) * (base + xpFlat.value);
      return {
        skill,
        skillText: skill,
        base,
        value,
      };
    });

    if (xpRewardsArr.length > 1) {
      const totalBase = xpRewardsArr.reduce((sum, r) => sum + r.base, 0);
      const value = xpRewardsArr.reduce((sum, r) => sum + r.value, 0);
      xpRewardsArr.push({
        skill: "xp",
        skillText: "total",
        base: totalBase,
        value,
      });
    }

    return xpRewardsArr;
  });

  const xpPerStep = computed(() => {
    return xpRewards.value.map(({ skill, skillText, value }) => {
      return {
        skill,
        skillText,
        value: value / stepsPerAction.value,
        displayedValue: value / stepsPerCompletion.value,
      };
    });
  });

  return {
    maxWorkEfficiency,
    workEfficiency,
    uncappedWorkEfficiency,
    effectiveMaxWorkEfficiency,
    findCollectibles,
    findGems,
    findBirdNests,
    fineMaterialFind,
    chestFind,
    qualityOutcome,
    doubleAction,
    doubleRewards,
    noMaterialsConsumed,
    stepsRequiredFlat,
    stepsRequiredPercent,
    stepsPerAction,
    uncappedStepsPerCompletion,
    stepsPerCompletion,
    stepsPerRewardRoll,
    craftsPerMaterial,
    xpRewards,
    xpPerStep,
  };
}
