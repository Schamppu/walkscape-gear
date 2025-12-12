import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useRequirements } from "./useRequirements";

export function useLevelBonus() {
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();
  const itemStore = useItemsStore();
  const { getLevelRequirementsMap } = useRequirements();

  const getLevelRequirement = (activity, skill) =>
    getLevelRequirementsMap(activity.requirements)?.[skill] || 1;

  const workEfficiencyBonus = computed(() => {
    if (!activityStore.activitySelected && !activityStore.recipeSelected)
      return null;
    const isActivity = activityStore.activitySelected;
    const activity = isActivity ? activityStore.activity : activityStore.recipe;
    const isTravelling = activity.id === "travelling";

    const [skill] = isActivity
      ? activity.relatedSkillsList
      : activity.relatedSkills;
    const levelRequirement = getLevelRequirement(activity, skill);
    const playerLevel = playerStore.skillLevels[skill] || 1;

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
    if (!activityStore.recipeSelected) return null;
    const recipe = activityStore.recipe;
    const [itemId] = Object.keys(recipe.itemRewards);
    if (
      !(
        itemId in itemStore.allItems &&
        itemStore.allItems[itemId].type === "crafted"
      )
    )
      return null;

    const [skill] = recipe.relatedSkills;
    const levelRequirement = getLevelRequirement(recipe);
    const playerLevel = playerStore.skillLevels[skill] || 1;
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
