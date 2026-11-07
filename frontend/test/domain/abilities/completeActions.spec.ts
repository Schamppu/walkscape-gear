import { describe, it, expect } from "vitest";
import {
  extractCompleteActionsSpec,
  abilityFineRecipeOutcome,
  completeActionsScale,
  scaleDropInfoMap,
  buildRecipeOutputDropInfo,
  completeActionsGoldValue,
  completeActionsDropValue,
  completeActionsXpPerStep,
  completeActionsXpBreakdown,
  fineRecipeOutputShare,
  fineRecipeOutputShareWithModifiers,
} from "@/domain/abilities/completeActions";
import { abilityStepsPerActivation } from "@/domain/abilities/abilityLootTables";
import {
  computeRecipeValue,
  buildGoldBreakdown,
  type RecipeValueParams,
} from "@/domain/drops/aggregateDropValue";
import type { AbilityDetail } from "@/domain/types/ability";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { ItemValueMap } from "@/domain/types/item";

// Trimmed from the live API response for "flambé".
const flambe = {
  id: "flambé",
  name: "Flambé",
  type: "active",
  icon: "assets/icons/abilities/living_flame_ability.png",
  requirements: [],
  cooldown: { id: "cooldown-flambe", steps: 2500, charges: 15 },
  data: [
    {
      dataType: "normal",
      actions: [
        { type: "completeActions", runtimeType: "completeActions", count: 3 },
      ],
    },
    {
      dataType: null,
      actions: [
        {
          type: "effect",
          runtimeType: "effect",
          duration: { actions: 3 },
          attributes: [
            {
              id: "15ab15c1",
              statText: "Fine recipe outcome",
              skillText: "Cooking",
              requirements: [
                {
                  type: "mainSkill",
                  name: null,
                  opposite: false,
                  requirement: { skill: "cooking" },
                },
              ],
              stats: [
                {
                  stat: "fine_recipe_outcome",
                  name: "Fine recipe outcome",
                  type: "fineMaterialOutcome",
                  isPercent: true,
                  value: 0.03,
                  isNegative: false,
                  isMultiplicative: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as unknown as AbilityDetail;

const pass = () => true;

function dropInfo(partial: Partial<DropItemInfo>): DropItemInfo {
  return {
    id: "x",
    icon: undefined,
    sources: [],
    totalDropChance: 50,
    stepsPerItem: 0,
    itemsPerStep: 0,
    stepsPerNormal: 0,
    stepsPerFine: 0,
    stepsPerRare: 0,
    dropCounts: "1",
    variableRequirement: null,
    ...partial,
  };
}

describe("extractCompleteActionsSpec", () => {
  it("reads the completed action count", () => {
    expect(extractCompleteActionsSpec(flambe)).toEqual({ count: 3 });
  });

  it("returns null for abilities without completeActions", () => {
    expect(
      extractCompleteActionsSpec({
        data: [{ dataType: "normal", actions: [] }],
      } as unknown as AbilityDetail),
    ).toBeNull();
    expect(extractCompleteActionsSpec(null)).toBeNull();
  });
});

describe("abilityFineRecipeOutcome", () => {
  it("sums fineMaterialOutcome from the ability's effect attributes", () => {
    expect(abilityFineRecipeOutcome(flambe, pass)).toBeCloseTo(0.03);
  });

  it("ignores attributes whose requirements fail", () => {
    expect(abilityFineRecipeOutcome(flambe, () => false)).toBe(0);
  });
});

describe("completeActionsScale", () => {
  it("is count × stepsPerCompletion / stepsPerActivation", () => {
    expect(completeActionsScale(3, 100, 2500)).toBeCloseTo(0.12);
  });

  it("is 0 for a time-based (null) cooldown or invalid input", () => {
    expect(completeActionsScale(3, 100, null)).toBe(0);
    expect(completeActionsScale(0, 100, 2500)).toBe(0);
    expect(completeActionsScale(3, 0, 2500)).toBe(0);
  });

  it("time-based cooldowns give no steps per activation", () => {
    expect(abilityStepsPerActivation({ id: "cd", hours: 1 }, 50)).toBeNull();
  });
});

describe("scaleDropInfoMap", () => {
  it("divides steps and multiplies rates by the scale, keeping fine split", () => {
    const map = {
      oak_logs: dropInfo({
        id: "oak_logs",
        stepsPerItem: 50,
        itemsPerStep: 20,
        stepsPerNormal: 50 / 0.99,
        stepsPerFine: 50 / 0.01,
      }),
    };
    const scaled = scaleDropInfoMap(map, 0.5).oak_logs;
    expect(scaled.stepsPerItem).toBeCloseTo(100);
    expect(scaled.itemsPerStep).toBeCloseTo(10);
    expect(scaled.stepsPerNormal).toBeCloseTo(100 / 0.99);
    expect(scaled.stepsPerFine).toBeCloseTo(100 / 0.01);
    expect(scaled.stepsPerRare).toBe(0);
    expect(scaled.totalDropChance).toBe(50);
  });

  it("returns an empty map for a zero scale", () => {
    expect(scaleDropInfoMap({ a: dropInfo({ stepsPerItem: 1 }) }, 0)).toEqual(
      {},
    );
  });
});

describe("buildRecipeOutputDropInfo (Flambé on Bake Bread)", () => {
  // stepsPerCompletion = stepsPerRewardRoll = 100 (no double action/rewards)
  const scale = completeActionsScale(3, 100, 2500);
  const base = {
    itemRewards: { bread: 1 },
    stepsPerRewardRoll: 100,
    scale,
    fineMaterialIds: { bread: true },
    craftedGearIds: {},
    iconOf: (id: string) => `${id}.png`,
  };

  it("splits output by the 3% fine recipe outcome", () => {
    const bread = buildRecipeOutputDropInfo({ ...base, fineShare: 0.03 }).bread;
    expect(bread.stepsPerItem).toBeCloseTo(2500 / 3);
    expect(bread.stepsPerFine).toBeCloseTo(2500 / 3 / 0.03); // ≈27.8k
    expect(bread.stepsPerNormal).toBeCloseTo(2500 / 3 / 0.97); // ≈859
    expect(bread.icon).toBe("bread.png");
    expect(bread.totalDropChance).toBe(100);
  });

  it("is 100% fine when fine materials are used", () => {
    const bread = buildRecipeOutputDropInfo({ ...base, fineShare: 1 }).bread;
    expect(bread.stepsPerNormal).toBe(0);
    expect(bread.stepsPerFine).toBeCloseTo(2500 / 3);
  });

  it("does not split items that can't be fine", () => {
    const bread = buildRecipeOutputDropInfo({
      ...base,
      fineShare: 0.03,
      fineMaterialIds: {},
    }).bread;
    expect(bread.stepsPerFine).toBe(0);
    expect(bread.stepsPerNormal).toBeCloseTo(2500 / 3);
  });
});

describe("completeActionsGoldValue", () => {
  const itemValues = {
    bread: { common: 10, fine: 100 },
    flour: { common: 2, fine: 20 },
  } as unknown as ItemValueMap;

  const recipeParams: RecipeValueParams = {
    materials: [{ options: [{ item: "flour", amount: 1 }] }],
    itemRewards: { bread: 1 },
    stepsPerRewardRoll: 100,
    stepsPerAction: 100,
    noMaterialsConsumed: 0,
    useFine: false,
    allGearItems: {},
    itemValues,
    craftingOdds: [],
  } as unknown as RecipeValueParams;

  it("defaults to the old normal-only recipe value without a fine share", () => {
    // 10 per craft reward − 2 per craft materials, 10 crafts per 1k steps
    expect(computeRecipeValue(recipeParams)).toBeCloseTo(80);
  });

  it("scales the recipe value re-evaluated with the fine share", () => {
    const scale = completeActionsScale(3, 100, 2500); // 0.12
    // per craft: 0.97·10 + 0.03·100 − 2 = 10.7 → ×10 crafts/1k → 107
    expect(completeActionsGoldValue(scale, 0, recipeParams, 0.03)).toBeCloseTo(
      0.12 * 107,
    );
  });

  it("applies noMaterialsConsumed to the material cost", () => {
    const scale = completeActionsScale(3, 100, 2500);
    const value = completeActionsGoldValue(
      scale,
      0,
      { ...recipeParams, noMaterialsConsumed: 0.5 },
      0,
    );
    // per craft: 10 − 2·0.5 = 9 → ×10 → 90
    expect(value).toBeCloseTo(0.12 * 90);
  });

  it("scales drop gold for activities", () => {
    expect(completeActionsGoldValue(0.5, 40, undefined, 0)).toBeCloseTo(20);
  });

  it("is 0 without a valid scale", () => {
    expect(completeActionsGoldValue(0, 40, recipeParams, 0.03)).toBe(0);
  });
});

describe("completeActionsDropValue", () => {
  it("scales a context value by the ability rate", () => {
    expect(completeActionsDropValue(0.12, 50)).toBeCloseTo(6);
    expect(completeActionsDropValue(0, 50)).toBe(0);
  });
});

describe("buildGoldBreakdown extra lines", () => {
  it("appends non-zero extra lines (e.g. one per ability)", () => {
    const lines = buildGoldBreakdown(
      {},
      {},
      {},
      {} as ItemValueMap,
      undefined,
      [
        { icon: "flambe.png", label: "Flambé", value: 12.8 },
        { icon: "x.png", label: "Nothing", value: 0 },
      ],
    );
    expect(lines).toEqual([
      { icon: "flambe.png", label: "Flambé", value: 12.8 },
    ]);
  });
});

describe("completeActionsXpPerStep", () => {
  const xpPerStep = [
    { skill: "cooking", skillText: "Cooking", value: 0.5, displayedValue: 0.5 },
    { skill: "agility", skillText: "Agility", value: 0, displayedValue: 0 },
  ];

  it("scales context XP per step by the ability rate and multiplier", () => {
    // Flambé on a 100-step recipe: 3 × 100 / 2500 = 0.12; fine mats ×1.75
    expect(completeActionsXpPerStep(0.12, xpPerStep, 1.75)).toEqual([
      { skill: "cooking", skillText: "Cooking", value: 0.5 * 0.12 * 1.75 },
    ]);
  });

  it("is empty without a valid scale", () => {
    expect(completeActionsXpPerStep(0, xpPerStep)).toEqual([]);
  });
});

describe("completeActionsXpBreakdown", () => {
  it("gives one line per ability, summed over skills, skipping zero XP", () => {
    const lines = completeActionsXpBreakdown([
      {
        name: "Flambé",
        icon: "flambe.png",
        xpPerStep: [
          { skill: "cooking", skillText: "Cooking", value: 0.06 },
          { skill: "agility", skillText: "Agility", value: 0.01 },
        ],
      },
      { name: "Idle", icon: "idle.png", xpPerStep: [] },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ icon: "flambe.png", label: "Flambé" });
    expect(lines[0].value).toBeCloseTo(0.07);
  });
});

describe("fineRecipeOutputShare (in-game: once per completion)", () => {
  it("equals the chance without double action / double rewards", () => {
    expect(fineRecipeOutputShare(0.03, 1)).toBeCloseTo(0.03);
  });

  it("is diluted by extra reward rolls per completion", () => {
    // (1 + DA)(1 + DR) = 2 → only half the output share
    expect(fineRecipeOutputShare(0.03, 2)).toBeCloseTo(0.015);
  });

  it("is 0 without a chance and treats < 1 roll as 1", () => {
    expect(fineRecipeOutputShare(0, 2)).toBe(0);
    expect(fineRecipeOutputShare(0.03, 0)).toBeCloseTo(0.03);
  });

  it("keeps fine output per step independent of double rewards", () => {
    const scale = completeActionsScale(3, 100, 2500);
    const base = {
      itemRewards: { bread: 1 },
      scale,
      fineMaterialIds: { bread: true },
      craftedGearIds: {},
      iconOf: () => undefined,
    };
    const noDoubles = buildRecipeOutputDropInfo({
      ...base,
      stepsPerRewardRoll: 100,
      fineShare: fineRecipeOutputShare(0.03, 100 / 100),
    }).bread;
    // 100% double rewards: stepsPerRewardRoll halves, 2 rolls per completion
    const doubleRewards = buildRecipeOutputDropInfo({
      ...base,
      stepsPerRewardRoll: 50,
      fineShare: fineRecipeOutputShare(0.03, 100 / 50),
    }).bread;

    expect(doubleRewards.stepsPerFine).toBeCloseTo(noDoubles.stepsPerFine); // ≈27.8k
    expect(doubleRewards.stepsPerItem).toBeCloseTo(noDoubles.stepsPerItem / 2);
    expect(doubleRewards.stepsPerNormal).toBeLessThan(noDoubles.stepsPerNormal);
  });
});

describe("fineRecipeOutputShareWithModifiers (unused alternative)", () => {
  it("is the chance itself, so doubles scale fine output too", () => {
    expect(fineRecipeOutputShareWithModifiers(0.03)).toBeCloseTo(0.03);
    expect(fineRecipeOutputShareWithModifiers(2)).toBe(1);
  });
});
