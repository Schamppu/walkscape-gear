import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";

export function useLevelBonus() {
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();

  const workEfficiencyBonus = computed(() => {
    if (!activityStore.activitySelected || !activityStore.recipeSelected)
      return null;
    const [mainSkill, ..._] = activityStore.activity.relatedSkillsList;
    const levelRequirement =
      activityStore.activity.levelRequirementsMap[mainSkill];
    const playerLevel = playerStore.skillLevels[mainSkill] || 1;

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

  return {
    workEfficiencyBonus,
  };
}
