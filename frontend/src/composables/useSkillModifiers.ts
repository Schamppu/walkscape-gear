import { computed, type ComputedRef, type Ref } from "vue";
import { useEffectiveAttrs, type EffectiveAttrsContext } from "./useEffectiveAttrs";
import type { StatTotals } from "@/domain/effectiveAttrs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The fields on `ctx.source.value` that this composable reads.
 * Both `ActivityDetail` and `RecipeDetail` satisfy this shape at runtime.
 */
export type SkillModifiersSource = {
  maxWorkEfficiency: number;
  workRequired: number;
  /** Present on activities. */
  xpRewardsMap?: Record<string, number>;
  /** Present on recipes. */
  xpRewards?: Record<string, number>;
};

/**
 * Context for `useSkillModifiers`.
 * Narrows `source` to `SkillModifiersSource` so the extra fields are accessible.
 */
export type SkillModifiersContext = Omit<EffectiveAttrsContext, "source"> & {
  source: Ref<SkillModifiersSource | null>;
  activitySelected: Ref<boolean>;
};

export type XpReward = {
  skill: string;
  skillText: string;
  base: number;
  value: number;
};

export type XpPerStep = {
  skill: string;
  skillText: string;
  value: number;
  displayedValue: number;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Calculates effective skill modifiers based on the character's attributes and equipped items.
 */
export function useSkillModifiers(ctx: SkillModifiersContext): {
  maxWorkEfficiency: ComputedRef<number>;
  workEfficiency: ComputedRef<number>;
  uncappedWorkEfficiency: ComputedRef<number>;
  effectiveMaxWorkEfficiency: ComputedRef<number>;
  findCollectibles: ComputedRef<number>;
  findGems: ComputedRef<number>;
  findBirdNests: ComputedRef<number>;
  fineMaterialFind: ComputedRef<number>;
  chestFind: ComputedRef<number>;
  qualityOutcome: ComputedRef<number>;
  doubleAction: ComputedRef<number>;
  doubleRewards: ComputedRef<number>;
  noMaterialsConsumed: ComputedRef<number>;
  stepsRequiredFlat: ComputedRef<number>;
  stepsRequiredPercent: ComputedRef<number>;
  stepsPerAction: ComputedRef<number>;
  uncappedStepsPerCompletion: ComputedRef<number>;
  stepsPerCompletion: ComputedRef<number>;
  stepsPerRewardRoll: ComputedRef<number>;
  stepsPerFineRoll: ComputedRef<number>;
  stepsPerCollectibleRoll: ComputedRef<number>;
  craftsPerMaterial: ComputedRef<number>;
  xpRewards: ComputedRef<XpReward[]>;
  xpPerStep: ComputedRef<XpPerStep[]>;
} {
  const { totalsByStat } = useEffectiveAttrs(ctx as EffectiveAttrsContext);

  // Helper function to get a specific stat modifier, defaulting to "percent" if not specified
  const getStat = (stat: string, key: keyof StatTotals[string] = "percent"): number => {
    const source: StatTotals = { ...totalsByStat.value };
    return stat in source
      ? key in source[stat]
        ? source[stat][key]["sum"]
        : 0
      : 0;
  };

  // Maximum work efficiency is determined by the activity or recipe, defaulting to 1 if not specified
  const maxWorkEfficiency = computed<number>(() => {
    return ctx.source.value?.maxWorkEfficiency || 1;
  });

  // Effective max work efficiency accounts for rounding done by the game
  // Game rounds steps up, so we calculate minimum efficiency needed
  // to reach that step count and then convert back to efficiency
  const effectiveMaxWorkEfficiency = computed<number>(() => {
    const { workRequired } = ctx.source.value || { workRequired: 1 };
    const minSteps = Math.ceil(workRequired / maxWorkEfficiency.value);
    return workRequired / minSteps;
  });

  // Actual work efficiency is the sum of all modifiers, capped at the effective max to reflect in-game rounding
  // abbreviated as WE
  const workEfficiency = computed<number>(() => {
    const workEfficiency = getStat("workEfficiency");
    return Math.min(1 + workEfficiency, maxWorkEfficiency.value);
  });

  // Uncapped work efficiency is the raw sum of modifiers without any caps,
  // mostly to show how much efficiency the character has beyond the cap,
  // even though it won't affect the actual steps required due to rounding
  const uncappedWorkEfficiency = computed<number>(() => {
    return 1 + getStat("workEfficiency");
  });

  // Experience modifiers
  const xpFlat = computed<number>(() => {
    return getStat("bonusExperience", "flat");
  });

  const xpPercent = computed<number>(() => {
    return getStat("bonusExperience", "percent");
  });

  /**
   * Double action has a chance to occur on every activity completion except those resulting from Double action itself.
   * you cannot get an endless string of Double action activations, only one per real action.
   * Has a cap of 100% which would result in a Double action for every action.
   *
   * abbreviated as DA
   */
  const doubleAction = computed<number>(() => {
    return Math.min(1, getStat("doubleAction", "percent"));
  });

  /**
   * Double rewards gives a chance for each reward roll on a loot table to occur twice,
   * effectively doubling the rewards from that roll.
   *
   * abbreviated as DR
   */
  const doubleRewards = computed<number>(() => {
    return Math.min(1, getStat("doubleRewards", "percent"));
  });

  /**
   * No materials consumed gives a chance for the materials required for a recipe to not be consumed on that action.
   * Applies only to recipes, not activities, and only affects the materials consumed, not the steps required or rewards gained.
   * Has a cap of 100% which would result in no materials ever being consumed.
   *
   * abbreviated as NMC
   */
  const noMaterialsConsumed = computed<number>(() => {
    return Math.min(1, getStat("noMaterialsConsumed", "percent"));
  });

  /**
   * Find modifiers give an increased chance of success for loot tables with the same type
   * The effective cap is for such a table to reach 100% chance to trigger on each roll
   * For example:
   * - base chest chance is 1/250
   * - 24900% find chest would give a 100% chance for a chest on each roll
   * - The stat is so high it is effectively impossible to reach 100%
   * - with current modifiers, the highest find chest is less than 200%
   *
   * Other find modifiers have their chances defined elsewhere (loot tables)
   * fine material chance is a static 1/100 base chance defined here,
   * with each percent increasing the chance by 1% of that base
   * (so 100% would be 2/100, 200% would be 3/100, etc)
   *
   * findCollectibles and fineMaterialFind only apply to activities
   */
  const findCollectibles = computed<number>(() => {
    return 1 + getStat("findCollectibles", "percent");
  });

  const findGems = computed<number>(() => {
    return 1 + getStat("findGems", "percent");
  });

  const findBirdNests = computed<number>(() => {
    return 1 + getStat("findBirdNests", "percent");
  });

  // abbreviated as FMF
  const fineMaterialFind = computed<number>(() => {
    return (1 + getStat("fineMaterialFind", "percent")) / 100;
  });

  const chestFind = computed<number>(() => {
    return 1 + getStat("chestFind", "percent");
  });

  // Quality outcome increases chance of crafting higher quality items
  // only applies to recipes that have a crafted item as reward
  const qualityOutcome = computed<number>(() => {
    return getStat("qualityOutcome", "flat");
  });

  // Steps required modifiers.
  // Reduced steps per action after work efficiency and it's cape are applied
  const stepsRequiredFlat = computed<number>(() => {
    return getStat("stepsRequired", "flat");
  });

  const stepsRequiredPercent = computed<number>(() => {
    return 1 + getStat("stepsRequired", "percent");
  });

  // Steps per completion is the number of steps required to complete an activity or recipe,
  // after accounting for work efficiency and steps required modifiers.
  // Mostly to show if selected gear gives bonuses beyond what is helpful
  const uncappedStepsPerCompletion = computed<number>(() => {
    const { workRequired } = ctx.source.value || { workRequired: 0 };
    if (!workRequired) return 0;
    return (
      Math.ceil(
        (workRequired / workEfficiency.value) * stepsRequiredPercent.value,
      ) + stepsRequiredFlat.value
    );
  });

  // steps per completion with the global cap of 10 steps per completion
  const stepsPerCompletion = computed<number>(() => {
    return Math.max(10, uncappedStepsPerCompletion.value);
  });

  // Steps per action is the average number of steps to complete an in-game action
  // Accounting for double action
  const stepsPerAction = computed<number>(() => {
    return stepsPerCompletion.value / (1 + doubleAction.value);
  });

  // Steps per reward roll is the average number of steps between each reward roll on a loot table,
  // accounting for double action and double rewards,
  // which both reduce the effective number of steps per reward roll
  const stepsPerRewardRoll = computed<number>(() => {
    return stepsPerAction.value / (1 + doubleRewards.value);
  });

  const stepsPerFineRoll = computed<number>(() => {
    return stepsPerRewardRoll.value / (1 + fineMaterialFind.value);
  });

  const stepsPerCollectibleRoll = computed<number>(() => {
    return stepsPerRewardRoll.value / (1 + findCollectibles.value);
  });

  // Crafts per material is the average number of outputs
  // that will be generated per used material
  const craftsPerMaterial = computed<number>(() => {
    return (1 + doubleRewards.value) / (1 - noMaterialsConsumed.value);
  });

  // XP rewards returns a list of XP rewards
  // categorized by the skill
  // if activity gives XP to multiple skills, a total XP reward is also calculated as the sum of all rewards
  const xpRewards = computed<XpReward[]>(() => {
    if (!ctx.source.value) return [];

    const xpRewardsMap = ctx.activitySelected.value
      ? ctx.source.value.xpRewardsMap
      : ctx.source.value.xpRewards;
    if (!xpRewardsMap) return [];

    const xpRewardsArr: XpReward[] = Object.entries(xpRewardsMap).map(
      ([skill, base]) => {
        const value = (1 + xpPercent.value) * (base + xpFlat.value);
        return {
          skill,
          skillText: skill,
          base,
          value,
        };
      },
    );

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

  // XP per step calculates the average XP gained per step taken,
  // accounting for all modifiers that affect XP and steps
  const xpPerStep = computed<XpPerStep[]>(() => {
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
    stepsPerFineRoll,
    stepsPerCollectibleRoll,
    craftsPerMaterial,
    xpRewards,
    xpPerStep,
  };
}
