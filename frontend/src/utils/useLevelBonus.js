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

  const recipeLevelRequirement = (recipe) =>
    recipe.requirements
      .map(({ requirement }) => requirement)
      .filter(
        ({ type, requirement }) =>
          type === "skillLevel" && requirement.skill === skill
      )?.[0] || 1;

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
          stat: "stat-work_efficiency-b0d308d8-68b6-459d-9959-adb9d97e4535",
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
          stat: "stat-crafting_outcome-2a45afff-5426-4d97-80e8-73381d663c25",
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
