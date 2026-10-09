import { describe, it, expect } from "vitest";
import {
  buildCoinDrops,
  buildRecipeCoins,
  coinsPerAction,
  findGroupsOf,
  type CoinProfile,
} from "@/domain/advancedOptimiser/coins";
import { extracted } from "@/domain/advancedOptimiser/targets";
import { computeBaseline, normalise } from "@/domain/advancedOptimiser/normalisation";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import {
  makeDropProfile,
  makeExtractionContext,
  makeSkillModifiers,
  makeTarget,
} from "../../fixtures/advancedOptimiser";

const profile = (overrides: Partial<CoinProfile> = {}): CoinProfile => ({
  drops: [],
  recipe: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// coinsPerAction
// ---------------------------------------------------------------------------

describe("coinsPerAction", () => {
  it("is 0 without a coin profile", () => {
    expect(coinsPerAction(undefined, makeSkillModifiers(), null)).toBe(0);
  });

  it("values drops per reward roll, with the fine bonus at the fine chance", () => {
    const coins = profile({ drops: [{ finds: [], basePerRoll: 10, fineBonusPerRoll: 100 }] });
    const m = makeSkillModifiers({ doubleRewards: 0.5, fineMaterialFind: 0.02 });
    expect(coinsPerAction(coins, m, null)).toBeCloseTo(1.5 * (10 + 100 * 0.02), 10);
  });

  it("scales each group by its find bonuses", () => {
    const coins = profile({
      drops: [
        { finds: [], basePerRoll: 1, fineBonusPerRoll: 0 },
        { finds: ["chestTable"], basePerRoll: 2, fineBonusPerRoll: 0 },
        { finds: ["gem"], basePerRoll: 3, fineBonusPerRoll: 0 },
        { finds: ["collectible", "birdNest"], basePerRoll: 4, fineBonusPerRoll: 0 },
      ],
    });
    const m = makeSkillModifiers({
      chestFind: 2,
      findGems: 3,
      findCollectibles: 1.5,
      findBirdNests: 2,
    });
    expect(coinsPerAction(coins, m, null)).toBeCloseTo(1 + 2 * 2 + 3 * 3 + 4 * 1.5 * 2, 10);
  });

  it("is net for recipes: rewards minus materials consumed", () => {
    const coins = profile({
      recipe: { craftedPerRoll: {}, materialRewardPerRoll: 30, materialCostPerAction: 10 },
    });
    expect(coinsPerAction(coins, makeSkillModifiers(), null)).toBeCloseTo(20, 10);
    const lucky = makeSkillModifiers({ noMaterialsConsumed: 0.5, doubleRewards: 1 });
    expect(coinsPerAction(coins, lucky, null)).toBeCloseTo(2 * 30 - 5, 10);
  });

  it("can be negative for a loss-making recipe", () => {
    const coins = profile({
      recipe: { craftedPerRoll: {}, materialRewardPerRoll: 5, materialCostPerAction: 10 },
    });
    expect(coinsPerAction(coins, makeSkillModifiers(), null)).toBeCloseTo(-5, 10);
  });

  it("values crafted output across the quality odds", () => {
    const craftedPerRoll = { common: 10, uncommon: 20, rare: 40, epic: 80, legendary: 160, ethereal: 320 };
    const coins = profile({
      recipe: { craftedPerRoll, materialRewardPerRoll: 0, materialCostPerAction: 0 },
    });
    const m = makeSkillModifiers({ qualityOutcome: 300 });
    const quality = { levelReq: 50, fineMode: "none" as const };
    const expected = getOutcomeOdds(50, 300, "none").reduce(
      (sum, { qualityValue, value }) => sum + value * (craftedPerRoll[qualityValue as keyof typeof craftedPerRoll] ?? 0),
      0,
    );
    expect(coinsPerAction(coins, m, quality)).toBeCloseTo(expected, 10);
    expect(coinsPerAction(coins, m, quality)).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Extraction and normalisation
// ---------------------------------------------------------------------------

describe("coins target", () => {
  const ctxWith = (coins: CoinProfile, modifiers = makeSkillModifiers()) =>
    makeExtractionContext({ modifiers, drops: makeDropProfile({ coins }) });

  it("is extracted per step and per material", () => {
    const coins = profile({ drops: [{ finds: [], basePerRoll: 10, fineBonusPerRoll: 0 }] });
    const ctx = ctxWith(coins, makeSkillModifiers({ noMaterialsConsumed: 0.5 }));
    expect(extracted("coins", "step", ctx)).toBeCloseTo(1, 10);
    expect(extracted("coins", "material", ctx)).toBeCloseTo(20, 10);
  });

  it("normalises a negative baseline so getting closer to 0 is better", () => {
    const coins = profile({
      recipe: { craftedPerRoll: {}, materialRewardPerRoll: 5, materialCostPerAction: 10 },
    });
    const target = makeTarget("coins", "action");
    const baseline = computeBaseline([target], ctxWith(coins));
    expect(baseline.get("coins/action")).toBeCloseTo(-5, 10);

    const halfCost = extracted("coins", "action", ctxWith(coins, makeSkillModifiers({ noMaterialsConsumed: 0.5 })));
    expect(halfCost).toBeCloseTo(0, 10);
    expect(normalise(baseline, target, halfCost)).toBeCloseTo(2, 10);
    expect(normalise(baseline, target, -5)).toBeCloseTo(1, 10);
  });
});

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

describe("buildCoinDrops", () => {
  const itemValues = { ore: { common: 5, fine: 25 }, hat: { common: 50, rare: 200 } };

  it("values gold, materials (with fine bonus) and gear at its quality", () => {
    const [group] = buildCoinDrops(
      [{
        finds: [],
        dropMap: {
          gold: { stepsPerItem: 0.1, stepsPerFine: 0 },
          ore: { stepsPerItem: 2, stepsPerFine: 2 },
          hat: { stepsPerItem: 100, stepsPerFine: 0 },
        },
      }],
      { hat: "rare" },
      itemValues,
    );
    expect(group.basePerRoll).toBeCloseTo(10 + 0.5 * 5 + 0.01 * 200, 10);
    expect(group.fineBonusPerRoll).toBeCloseTo(0.5 * (25 - 5), 10);
  });

  it("keeps groups apart and drops worthless ones", () => {
    const groups = buildCoinDrops(
      [
        { finds: ["chestTable"], dropMap: { gold: { stepsPerItem: 1, stepsPerFine: 0 } } },
        { finds: ["gem"], dropMap: { junk: { stepsPerItem: 1, stepsPerFine: 0 } } },
      ],
      {},
      itemValues,
    );
    expect(groups).toEqual([{ finds: ["chestTable"], basePerRoll: 1, fineBonusPerRoll: 0 }]);
  });
});

describe("findGroupsOf", () => {
  it("picks the find-bonus table types", () => {
    expect(findGroupsOf(["chestTable", "other"])).toEqual(["chestTable"]);
    expect(findGroupsOf(["collectible", "birdNest"])).toEqual(["collectible", "birdNest"]);
    expect(findGroupsOf(["main"])).toEqual([]);
  });
});

describe("buildRecipeCoins", () => {
  const itemValues = {
    bar: { common: 30, fine: 90 },
    sword: { common: 100, uncommon: 150 },
    ore: { common: 5, fine: 20 },
    handle: { common: 40, uncommon: 60 },
  };
  const isGear = (id: string) => id === "sword" || id === "handle";

  it("splits crafted and material rewards and costs the first material options", () => {
    const coins = buildRecipeCoins({
      materials: [
        { options: [{ item: "ore", amount: 2 }, { item: "bar", amount: 1 }] },
        { options: [{ item: "handle", amount: 1 }] },
      ],
      itemRewards: { sword: 1, bar: 2 },
      isGear,
      isCrafted: (id) => id === "sword",
      itemValues,
      useFine: false,
    });
    expect(coins.craftedPerRoll).toEqual({ common: 100, uncommon: 150 });
    expect(coins.materialRewardPerRoll).toBe(60);
    expect(coins.materialCostPerAction).toBe(2 * 5 + 40);
  });

  it("uses fine values with fine inputs", () => {
    const coins = buildRecipeCoins({
      materials: [{ options: [{ item: "ore", amount: 2 }] }],
      itemRewards: { bar: 1 },
      isGear,
      isCrafted: () => false,
      itemValues,
      useFine: true,
    });
    expect(coins.materialRewardPerRoll).toBe(90);
    expect(coins.materialCostPerAction).toBe(40);
  });
});
