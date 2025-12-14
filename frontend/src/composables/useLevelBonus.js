import { computed } from "vue";
import { useRequirements } from "./useRequirements";

export function useLevelBonus(ctx) {
  const { getLevelRequirementsMap } = useRequirements(ctx);

  const getLevelRequirement = (activity, skill) =>
    getLevelRequirementsMap(activity.requirements)?.[skill] || 1;

  const workEfficiencyBonus = computed(() => {
    if (!ctx.activitySelected && !ctx.recipeSelected) return null;

    const activity = ctx.activitySelected
      ? ctx.activity.value
      : ctx.recipe.value;

    if (!activity) return null;

    const isTravelling = activity.id === "travelling";

    const [skill] = ctx.activitySelected
      ? activity.relatedSkillsList
      : activity.relatedSkills;

    const levelRequirement = getLevelRequirement(activity, skill);
    const playerLevel = ctx.skillLevels.value[skill] || 1;

    const levelDiff = isTravelling
      ? Math.max(playerLevel - levelRequirement, 0)
      : Math.min(20, Math.max(playerLevel - levelRequirement, 0));

    const value = isTravelling ? levelDiff * 0.005 : levelDiff * 0.0125;

    return {
      id: "work_efficiency_bonus",
      requirements: [],
      stats: [
        {
          isMultiplicative: true,
          isNegative: false,
          isPercent: true,
          name: "Work Efficiency",
          stat: "work_efficiency",
          type: "workEfficiency",
          value,
        },
      ],
      item: {
        id: "work_efficiency_bonus",
        name: "From levels above requirement",
        icon: "",
      },
      tables: null,
    };
  });

  const qualityOutcomeBonus = computed(() => {
    if (!ctx.recipeSelected.value) return null;

    const recipe = ctx.recipe.value;
    if (!recipe) return null;

    const [itemId] = Object.keys(recipe.itemRewards);
    const item = ctx.allItems.value[itemId];

    if (!item || item.type !== "crafted") return null;

    const [skill] = recipe.relatedSkills;
    const levelRequirement = getLevelRequirement(recipe, skill);
    const playerLevel = ctx.skillLevels.value[skill] || 1;

    const value = Math.max(playerLevel - levelRequirement, 0);

    return {
      id: "quality_outcome_bonus",
      requirements: [],
      stats: [
        {
          isMultiplicative: true,
          isNegative: false,
          isPercent: false,
          name: "Quality Outcome",
          stat: "quality_outcome",
          type: "qualityOutcome",
          value,
        },
      ],
      item: {
        id: "quality_outcome_bonus",
        name: "From levels above requirement",
        icon: "",
      },
      tables: null,
    };
  });

  return {
    qualityOutcomeBonus,
    workEfficiencyBonus,
  };
}
