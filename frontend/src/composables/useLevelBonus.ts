import { computed, type ComputedRef, type Ref } from "vue";
import { useRequirements, type RequirementContext } from "./useRequirements";
import type { Requirement } from "@/domain/types/common";
import type { ActivityDetail } from "@/domain/types/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { Stat } from "@/domain/types/item";

/**
 * Calculates bonuses to work efficiency and quality outcome based on
 * the player's levels above the requirements for the selected activity or recipe.
 *
 * Work Efficiency Bonus:
 * - For travelling activities: 0.5% per level above the requirement.
 * - For all other activities: 1.25% per level above the requirement, up to a maximum of 20 levels.
 * - Applies to all activities and recipes
 *
 * Quality Outcome Bonus:
 * - For crafted items: 1 per level above the requirement.
 * - Only applies to recipes that reward crafted items.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal gear-item shape needed by this composable (type discrimination). */
export type LevelBonusGearItem = {
  name: string;
  icon: string;
  type: string;
};

/** Shape of the synthetic bonus attribute objects returned as computed values. */
export type LevelBonusAttr = {
  id: string;
  requirements: Requirement[];
  stats: Stat[];
  item: {
    id: string;
    name: string;
    icon: string;
  };
  tables: null;
};

/**
 * Context required by `useLevelBonus`.
 * Extends `RequirementContext` (forwarded unchanged to `useRequirements`)
 * with the three extra reactive refs this composable reads directly.
 */
export type LevelBonusContext = RequirementContext & {
  activitySelected: Ref<boolean>;
  recipeSelected: Ref<boolean>;
  skillLevels: Ref<Record<string, number>>;
  allGearItems: Ref<Record<string, LevelBonusGearItem>>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useLevelBonus(ctx: LevelBonusContext): {
  workEfficiencyBonus: ComputedRef<LevelBonusAttr | null>;
  qualityOutcomeBonus: ComputedRef<LevelBonusAttr | null>;
} {
  const { getLevelRequirementsMap } = useRequirements(ctx);

  const getLevelRequirement = (
    activity: { requirements?: Requirement[] | null },
    skill: string,
  ): number => getLevelRequirementsMap(activity.requirements)?.[skill] || 1;

  const workEfficiencyBonus = computed<LevelBonusAttr | null>(() => {
    if (!ctx.activitySelected.value && !ctx.recipeSelected.value) return null;

    const activity = ctx.activitySelected.value
      ? ctx.activity.value
      : ctx.recipe.value;

    if (!activity) return null;

    const isTravelling = activity.id === "travelling";

    const [skill] = ctx.activitySelected.value
      ? (activity as ActivityDetail).relatedSkillsList
      : (activity as RecipeDetail).relatedSkills;

    const levelRequirement = getLevelRequirement(
      activity as ActivityDetail | RecipeDetail,
      skill,
    );
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

  const qualityOutcomeBonus = computed<LevelBonusAttr | null>(() => {
    if (!ctx.recipeSelected.value) return null;

    const recipe = ctx.recipe.value;
    if (!recipe) return null;

    const [itemId] = Object.keys((recipe as RecipeDetail).itemRewards);
    const item = ctx.allGearItems.value[itemId];

    if (!item || item.type !== "crafted") return null;

    const [skill] = (recipe as RecipeDetail).relatedSkills;
    const levelRequirement = getLevelRequirement(
      recipe as RecipeDetail,
      skill,
    );
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
