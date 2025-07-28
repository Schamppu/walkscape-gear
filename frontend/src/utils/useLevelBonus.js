import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";

export function useLevelBonus() {
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();
  const itemStore = useItemsStore();

  const activityLevelRequirement = (activity, skill) =>
    activity.levelRequirementsMap[skill];

  const recipeLevelRequirement = (recipe) => {
    const [{ level }] = recipe.requirements
      .map(({ requirement }) => requirement)
      .filter(({ runtimeType }) => runtimeType === "skillLevel");
    return level || 1;
  };

  const workEfficiencyBonus = computed(() => {
    if (!activityStore.activitySelected && !activityStore.recipeSelected)
      return null;
    const isActivity = activityStore.activitySelected;
    const activity = isActivity ? activityStore.activity : activityStore.recipe;
    const [skill] = isActivity
      ? activity.relatedSkillsList
      : activity.relatedSkills;
    const levelRequirement = isActivity
      ? activityLevelRequirement(activity, skill)
      : recipeLevelRequirement(activity);
    const playerLevel = playerStore.skillLevels[skill] || 1;

    const levelDiff = Math.min(20, Math.max(playerLevel - levelRequirement, 0));
    const value = levelDiff * 0.0125;

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

  const craftingOutcomeBonus = computed(() => {
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
    const levelRequirement = recipeLevelRequirement(recipe);
    const playerLevel = playerStore.skillLevels[skill] || 1;
    const value = Math.max(playerLevel - levelRequirement, 0);

    return {
      id: "crafting_outcome_bonus",
      requirements: [],
      stats: [
        {
          isMultiplicative: true,
          isNegative: false,
          isPercent: false,
          name: "Crafting Outcome",
          stat: "crafting_outcome",
          type: "craftingOutcome",
          value,
        },
      ],
      item: {
        id: "crafting_outcome_bonus",
        name: "From levels above requirement",
        icon: "",
      },
      tables: null,
    };
  });

  return {
    craftingOutcomeBonus,
    workEfficiencyBonus,
  };
}
