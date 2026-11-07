import { computed, type ComputedRef } from "vue";
import type { XpReward, XpPerStep } from "@/domain/skillModifiers";
import { n } from "@/utils/number";

export type XpRewardDisplayItem = {
  skill: string;
  text: string;
  tooltipText: string;
};

export type XpPerStepDisplayItem = {
  skill: string;
  text: string;
  tooltipText: string;
};

/**
 * Transforms raw XP reward data into formatted display items for SkillBubble.
 *
 * @param xpRewards - Reactive list of XP rewards (skill, base, effective value).
 * @param xpPerStep - Reactive list of XP-per-step values.
 * @param multiplier - Optional reactive multiplier applied to effective values (e.g. fine materials bonus).
 */
export function useXpDisplay(
  xpRewards: ComputedRef<XpReward[]>,
  xpPerStep: ComputedRef<XpPerStep[]>,
  multiplier?: ComputedRef<number>,
) {
  const mult = multiplier ?? computed(() => 1);

  const xpRewardItems = computed<XpRewardDisplayItem[]>(() =>
    xpRewards.value.map(({ skill, skillText, value, base }) => {
      const effectiveValue = value * mult.value;
      return {
        skill,
        text: `${n(effectiveValue)} / ${n(base)}`,
        tooltipText: `Rewards ${n(effectiveValue)} ${skillText} XP`,
      };
    }),
  );

  const xpPerStepItems = computed<XpPerStepDisplayItem[]>(() =>
    xpPerStep.value.map(({ skill, skillText, value, displayedValue }) => {
      const effectiveValue = value * mult.value;
      const effectiveDisplayed = displayedValue * mult.value;
      return {
        skill,
        text: `${n(effectiveValue)} / ${n(effectiveDisplayed)}`,
        tooltipText: `Gains ${n(effectiveValue)} ${skillText} XP per step`,
      };
    }),
  );

  return { xpRewardItems, xpPerStepItems };
}
