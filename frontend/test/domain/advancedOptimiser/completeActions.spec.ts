import { describe, it, expect } from "vitest";
import { extracted } from "@/domain/advancedOptimiser/targets";
import {
  buildRecipeCoins,
  coinsPerAction,
  type CoinProfile,
} from "@/domain/advancedOptimiser/coins";
import { createSetScorer } from "@/domain/advancedOptimiser/scorer";
import {
  buildCompleteActionsAbility,
  completeActionsEffect,
  itemCompleteActionsAbilities,
  type CompleteActionsAbility,
} from "@/domain/abilities/completeActions";
import type { AbilityDetail } from "@/domain/types/ability";
import type { Requirement } from "@/domain/types/common";
import {
  locationKeywordsReq,
  makeDropProfile,
  makeExtractionContext,
  makeJob,
  makeLocationSummary,
  makeSkillModifiers,
  makeTarget,
  makeWorkerItem,
} from "../../fixtures/advancedOptimiser";

// Trimmed Flambé (live API): 3 completed actions per 2500 steps, 3% fine
// recipe outcome for cooking, not usable underwater.
const notUnderwater = {
  ...locationKeywordsReq(["underwater"]),
  opposite: true,
} as Requirement;

const flambeDetail = {
  id: "flambé",
  name: "Flambé",
  type: "active",
  icon: "",
  requirements: [notUnderwater],
  cooldown: { id: "cooldown-flambe", steps: 2500, charges: 15 },
  data: [
    { dataType: "normal", actions: [{ type: "completeActions", count: 3 }] },
    {
      dataType: null,
      actions: [
        {
          type: "effect",
          duration: { actions: 3 },
          attributes: [
            {
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
                  type: "fineMaterialOutcome",
                  isPercent: true,
                  value: 0.03,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as unknown as AbilityDetail;

const flambe = buildCompleteActionsAbility(flambeDetail)!;
const all = () => true;

// ---------------------------------------------------------------------------
// Spec + per-set effect
// ---------------------------------------------------------------------------

describe("buildCompleteActionsAbility", () => {
  it("captures count, cooldown, usage requirements and fine chances", () => {
    expect(flambe.count).toBe(3);
    expect(flambe.cooldown?.steps).toBe(2500);
    expect(flambe.requirements).toEqual([notUnderwater]);
    expect(flambe.fineChances).toHaveLength(1);
    expect(flambe.fineChances[0].value).toBeCloseTo(0.03);
  });

  it("is null for abilities that don't complete actions", () => {
    expect(
      buildCompleteActionsAbility({
        ...flambeDetail,
        data: [],
      } as unknown as AbilityDetail),
    ).toBeNull();
  });
});

describe("itemCompleteActionsAbilities", () => {
  const byId = { flambé: flambe };
  const pet = (level: number) => ({
    abilities: [{ ability: "flambé", unlockLevel: 5 }],
    quality: String(level),
  });

  it("includes the ability once the pet level unlocks it", () => {
    expect(itemCompleteActionsAbilities(pet(4), byId, new Set())).toEqual([]);
    expect(itemCompleteActionsAbilities(pet(5), byId, new Set())).toEqual([
      flambe,
    ]);
  });

  it("excludes abilities the user toggled off", () => {
    expect(
      itemCompleteActionsAbilities(pet(10), byId, new Set(["flambé"])),
    ).toEqual([]);
  });
});

describe("completeActionsEffect", () => {
  const mods = {
    stepsPerAction: 100,
    stepsPerCompletion: 100,
    stepsPerRewardRoll: 100,
  };

  it("scales by count × stepsPerCompletion / stepsPerActivation", () => {
    const effect = completeActionsEffect([flambe], mods, all);
    expect(effect.scale).toBeCloseTo(0.12);
    expect(effect.fineShare).toBeCloseTo(0.03);
  });

  it("dilutes the fine share by extra reward rolls (in-game rule)", () => {
    const effect = completeActionsEffect(
      [flambe],
      { ...mods, stepsPerRewardRoll: 50 },
      all,
    );
    expect(effect.fineShare).toBeCloseTo(0.015);
  });

  it("is empty when the ability's requirements fail", () => {
    expect(completeActionsEffect([flambe], mods, () => false)).toEqual({
      scale: 0,
      fineShare: 0,
    });
  });

  it("counts a duplicated ability once", () => {
    const effect = completeActionsEffect([flambe, flambe], mods, all);
    expect(effect.scale).toBeCloseTo(0.12);
  });

  it("ignores the fine chance when its own requirement fails", () => {
    const passes = (reqs: unknown) =>
      !(reqs as Requirement[]).some((r) => r.type === "mainSkill");
    const effect = completeActionsEffect([flambe], mods, passes);
    expect(effect.scale).toBeCloseTo(0.12);
    expect(effect.fineShare).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

describe("extracted with complete actions", () => {
  const ctx = makeExtractionContext({
    modifiers: makeSkillModifiers({ noMaterialsConsumed: 0.2 }),
    completeActions: { scale: 0.12, fineShare: 0 },
  });
  const plain = makeExtractionContext({
    modifiers: makeSkillModifiers({ noMaterialsConsumed: 0.2 }),
  });

  it("adds scale × yield to per-step targets", () => {
    expect(extracted("xp", "step", ctx)).toBeCloseTo(
      extracted("xp", "step", plain) * 1.12,
    );
    expect(extracted("rewardRolls", "step", ctx)).toBeCloseTo(
      extracted("rewardRolls", "step", plain) * 1.12,
    );
  });

  it("leaves per-action and per-material targets unchanged", () => {
    expect(extracted("xp", "action", ctx)).toBe(
      extracted("xp", "action", plain),
    );
    expect(extracted("xp", "material", ctx)).toBe(
      extracted("xp", "material", plain),
    );
  });
});

describe("coins with a fine recipe outcome share", () => {
  const recipe = buildRecipeCoins({
    materials: [{ options: [{ item: "flour", amount: 1 }] }],
    itemRewards: { bread: 1 },
    isGear: () => false,
    isCrafted: () => false,
    itemValues: {
      bread: { common: 10, fine: 100 },
      flour: { common: 2, fine: 20 },
    },
    useFine: false,
  });
  const coins: CoinProfile = { drops: [], recipe };
  const m = makeSkillModifiers();

  it("records the fine bonus per roll with normal inputs", () => {
    expect(recipe.materialRewardFineBonusPerRoll).toBe(90);
  });

  it("has no fine bonus with fine inputs (output is already fine)", () => {
    expect(
      buildRecipeCoins({
        materials: [],
        itemRewards: { bread: 1 },
        isGear: () => false,
        isCrafted: () => false,
        itemValues: { bread: { common: 10, fine: 100 } },
        useFine: true,
      }).materialRewardFineBonusPerRoll,
    ).toBe(0);
  });

  it("values a partial fine share between all-normal and all-fine", () => {
    expect(coinsPerAction(coins, m, null)).toBeCloseTo(8); // 10 − 2
    expect(coinsPerAction(coins, m, null, 0.03)).toBeCloseTo(8 + 0.03 * 90);
  });

  it("applies the share only to the completed actions in coins/step", () => {
    const ctx = makeExtractionContext({
      drops: makeDropProfile({ coins }),
      completeActions: { scale: 0.12, fineShare: 0.03 },
    });
    // (8 + 0.12 × (8 + 2.7)) / 10 steps per action
    expect(extracted("coins", "step", ctx)).toBeCloseTo((8 + 0.12 * 10.7) / 10);
  });
});

// ---------------------------------------------------------------------------
// Scorer (fixture activity: 100 steps per action, naked xp/step 0.5)
// ---------------------------------------------------------------------------

describe("createSetScorer with a complete-actions pet", () => {
  const withFlambe = (spec: CompleteActionsAbility = flambe) => ({
    ...makeWorkerItem("living_flame"),
    _completeActions: [spec],
  });

  it("raises xp / step by the ability's rate", () => {
    const score = createSetScorer(makeJob());
    const result = score({ pet: withFlambe() });
    // k = 3 × 100 / 2500 = 0.12
    expect(result.values["xp/step"]).toBeCloseTo(0.5 * 1.12);
    expect(result.score).toBeCloseTo(1.12);
  });

  it("leaves xp / action unchanged", () => {
    const score = createSetScorer(
      makeJob({ targets: [makeTarget("xp", "action", 1)] }),
    );
    expect(score({ pet: withFlambe() }).score).toBeCloseTo(1);
  });

  it("doesn't count the ability where its requirements fail", () => {
    const score = createSetScorer(makeJob());
    const underwater = makeLocationSummary("reef", "syrenthia", ["underwater"]);
    expect(
      score({ pet: withFlambe(), location: underwater }).score,
    ).toBeCloseTo(1);
  });
});
