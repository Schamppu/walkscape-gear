import { computed } from "vue";
import { useEffectiveAttrs } from "./useEffectiveAttrs";
import { useActivityStore } from "../store/activity";

export function useSkillModifiers() {
  const activityStore = useActivityStore();
  const { totalsByStat } = useEffectiveAttrs();

  const isActivity = computed(() => activityStore.activitySelected);
  const activity = computed(() => {
    if (!activityStore.activitySelected && !activityStore.recipeSelected)
      return null;
    return isActivity.value ? activityStore.activity : activityStore.recipe;
  });

  const getStat = (stat, key = "percent") => {
    return stat in totalsByStat.value
      ? key in totalsByStat.value[stat]
        ? totalsByStat.value[stat][key]["sum"]
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
    return getStat("doubleAction", "percent");
  });

  const doubleRewards = computed(() => {
    return getStat("doubleRewards", "percent");
  });

  const noMaterialsConsumed = computed(() => {
    return getStat("noMaterialsConsumed", "percent");
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

  const craftingOutcome = computed(() => {
    return getStat("craftingOutcome", "flat");
  });

  const stepsPerCompletion = computed(() => {
    const { workRequired } = activity.value || 0;
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

  const craftsPerMaterial = computed(() => {
    return (1 + doubleRewards.value) / (1 - noMaterialsConsumed.value);
  });

  const xpRewards = computed(() => {
    const xpRewardsMap = isActivity.value
      ? activity.value.xpRewardsMap
      : activity.value.xpRewards;
    if (!xpRewardsMap) return {};

    const xpRewardsArr = Object.entries(xpRewardsMap).map(([skill, base]) => {
      const value = (1 + xpPercent.value) * base + xpFlat.value;
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
    craftingOutcome,
    stepsPerCompletion,
    stepsPerRewardRoll,
    craftsPerMaterial,
    xpRewards,
    xpPerStep,
  };
}
