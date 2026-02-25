import { computed, type ComputedRef, type Ref } from "vue";
import {
  useEffectiveAttrs,
  type EffectiveAttrsContext,
} from "./useEffectiveAttrs";
import {
  calculateSkillModifiers,
  type SkillModifiersSource,
  type XpReward,
  type XpPerStep,
} from "@/domain/skillModifiers";

export type { SkillModifiersSource, XpReward, XpPerStep };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Context for `useSkillModifiers`.
 * Narrows `source` to `SkillModifiersSource` so the extra fields are accessible.
 */
export type SkillModifiersContext = Omit<EffectiveAttrsContext, "source"> & {
  source: Ref<SkillModifiersSource | null>;
  activitySelected: Ref<boolean>;
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

  const modifiers = computed(() =>
    calculateSkillModifiers(
      totalsByStat.value,
      ctx.source.value,
      ctx.activitySelected.value,
    )
  );

  return {
    maxWorkEfficiency: computed(() => modifiers.value.maxWorkEfficiency),
    workEfficiency: computed(() => modifiers.value.workEfficiency),
    uncappedWorkEfficiency: computed(
      () => modifiers.value.uncappedWorkEfficiency,
    ),
    effectiveMaxWorkEfficiency: computed(
      () => modifiers.value.effectiveMaxWorkEfficiency,
    ),
    findCollectibles: computed(() => modifiers.value.findCollectibles),
    findGems: computed(() => modifiers.value.findGems),
    findBirdNests: computed(() => modifiers.value.findBirdNests),
    fineMaterialFind: computed(() => modifiers.value.fineMaterialFind),
    chestFind: computed(() => modifiers.value.chestFind),
    qualityOutcome: computed(() => modifiers.value.qualityOutcome),
    doubleAction: computed(() => modifiers.value.doubleAction),
    doubleRewards: computed(() => modifiers.value.doubleRewards),
    noMaterialsConsumed: computed(() => modifiers.value.noMaterialsConsumed),
    stepsRequiredFlat: computed(() => modifiers.value.stepsRequiredFlat),
    stepsRequiredPercent: computed(() => modifiers.value.stepsRequiredPercent),
    stepsPerAction: computed(() => modifiers.value.stepsPerAction),
    uncappedStepsPerCompletion: computed(
      () => modifiers.value.uncappedStepsPerCompletion,
    ),
    stepsPerCompletion: computed(() => modifiers.value.stepsPerCompletion),
    stepsPerRewardRoll: computed(() => modifiers.value.stepsPerRewardRoll),
    stepsPerFineRoll: computed(() => modifiers.value.stepsPerFineRoll),
    stepsPerCollectibleRoll: computed(
      () => modifiers.value.stepsPerCollectibleRoll,
    ),
    craftsPerMaterial: computed(() => modifiers.value.craftsPerMaterial),
    xpRewards: computed(() => modifiers.value.xpRewards),
    xpPerStep: computed(() => modifiers.value.xpPerStep),
  };
}
