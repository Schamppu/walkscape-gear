/**
 * Purpose:
 * Pure calculation functions for skill modifier values derived from a
 * character's stat totals and the selected activity or recipe.
 *
 * Responsibilities:
 * - Read individual modifier values from aggregated stat totals.
 * - Derive all work-efficiency, step, XP, and find-chance modifiers.
 * - Return a fully typed result record.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any side effects.
 * - Mutate inputs.
 */

import type { StatTotals } from "@/domain/effectiveAttrs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The fields on the selected activity or recipe that this module reads.
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

export type SkillModifiersResult = {
  maxWorkEfficiency: number;
  workEfficiency: number;
  uncappedWorkEfficiency: number;
  effectiveMaxWorkEfficiency: number;
  findCollectibles: number;
  findGems: number;
  findBirdNests: number;
  fineMaterialFind: number;
  chestFind: number;
  qualityOutcome: number;
  doubleAction: number;
  doubleRewards: number;
  noMaterialsConsumed: number;
  stepsRequiredFlat: number;
  stepsRequiredPercent: number;
  stepsPerAction: number;
  uncappedStepsPerCompletion: number;
  stepsPerCompletion: number;
  stepsPerRewardRoll: number;
  stepsPerFineRoll: number;
  stepsPerCollectibleRoll: number;
  craftsPerMaterial: number;
  xpRewards: XpReward[];
  xpPerStep: XpPerStep[];
};

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/** Reads a sum value out of `StatTotals`, defaulting to `"percent"` if no key is given. */
function getStat(
  totals: StatTotals,
  stat: string,
  key: keyof StatTotals[string] = "percent",
): number {
  return stat in totals && key in totals[stat] ? totals[stat][key].sum : 0;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Derives all skill modifier values from aggregated stat totals and the
 * selected activity/recipe source.
 *
 * @param totals          - Aggregated flat/percent stat totals from all attr sources.
 * @param source          - The selected activity or recipe; `null` when nothing is selected.
 * @param activitySelected - Whether an activity (vs. recipe) is currently selected,
 *                           used to pick the correct XP rewards map.
 */
export function calculateSkillModifiers(
  totals: StatTotals,
  source: SkillModifiersSource | null,
  activitySelected: boolean,
): SkillModifiersResult {
  // --- Work efficiency -------------------------------------------------------

  const maxWorkEfficiency = source?.maxWorkEfficiency ?? 1;

  const workRequired = source?.workRequired ?? 1;
  const minSteps = Math.ceil(workRequired / maxWorkEfficiency);
  const effectiveMaxWorkEfficiency = workRequired / minSteps;

  const uncappedWorkEfficiency = 1 + getStat(totals, "workEfficiency");
  const workEfficiency = Math.min(uncappedWorkEfficiency, maxWorkEfficiency);

  // --- Steps -----------------------------------------------------------------

  const stepsRequiredFlat = getStat(totals, "stepsRequired", "flat");
  const stepsRequiredPercent = 1 + getStat(totals, "stepsRequired", "percent");

  const rawStepsPerCompletion = source?.workRequired
    ? Math.ceil((source.workRequired / workEfficiency) * stepsRequiredPercent) +
      stepsRequiredFlat
    : 0;

  const uncappedStepsPerCompletion = rawStepsPerCompletion;
  const stepsPerCompletion = Math.max(10, uncappedStepsPerCompletion);

  // --- Chance modifiers ------------------------------------------------------

  const doubleAction = Math.min(1, getStat(totals, "doubleAction", "percent"));
  const doubleRewards = Math.min(1, getStat(totals, "doubleRewards", "percent"));
  const noMaterialsConsumed = Math.min(1, getStat(totals, "noMaterialsConsumed", "percent"));

  // --- Find modifiers --------------------------------------------------------

  const findCollectibles = 1 + getStat(totals, "findCollectibles", "percent");
  const findGems = 1 + getStat(totals, "findGems", "percent");
  const findBirdNests = 1 + getStat(totals, "findBirdNests", "percent");
  const fineMaterialFind = (1 + getStat(totals, "fineMaterialFind", "percent")) / 100;
  const chestFind = 1 + getStat(totals, "chestFind", "percent");
  const qualityOutcome = getStat(totals, "qualityOutcome", "flat");

  // --- Step rates ------------------------------------------------------------

  const stepsPerAction = stepsPerCompletion / (1 + doubleAction);
  const stepsPerRewardRoll = stepsPerAction / (1 + doubleRewards);
  const stepsPerFineRoll = stepsPerRewardRoll / (1 + fineMaterialFind);
  const stepsPerCollectibleRoll = stepsPerRewardRoll / (1 + findCollectibles);
  const craftsPerMaterial = (1 + doubleRewards) / (1 - noMaterialsConsumed);

  // --- XP --------------------------------------------------------------------

  const xpFlat = getStat(totals, "bonusExperience", "flat");
  const xpPercent = getStat(totals, "bonusExperience", "percent");

  const xpRewardsMap = source
    ? activitySelected
      ? source.xpRewardsMap
      : source.xpRewards
    : undefined;

  const xpRewardsList: XpReward[] = xpRewardsMap
    ? Object.entries(xpRewardsMap).map(([skill, base]) => ({
        skill,
        skillText: skill,
        base,
        value: (1 + xpPercent) * (base + xpFlat),
      }))
    : [];

  if (xpRewardsList.length > 1) {
    xpRewardsList.push({
      skill: "xp",
      skillText: "total",
      base: xpRewardsList.reduce((sum, r) => sum + r.base, 0),
      value: xpRewardsList.reduce((sum, r) => sum + r.value, 0),
    });
  }

  const xpPerStep: XpPerStep[] = xpRewardsList.map(({ skill, skillText, value }) => ({
    skill,
    skillText,
    value: value / stepsPerAction,
    displayedValue: value / stepsPerCompletion,
  }));

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
    xpRewards: xpRewardsList,
    xpPerStep,
  };
}
