import { describe, it, expect } from "vitest";
import { buildDropProfile, extracted } from "@/domain/advancedOptimiser/targets";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import { materialValue } from "@/domain/drops/aggregateDropValue";
import {
  makeDropProfile,
  makeExtractionContext,
  makeSkillModifiers,
} from "../../fixtures/advancedOptimiser";

// Base fixture: 10 steps per action, 50 fishing XP per action, no bonuses.

// ---------------------------------------------------------------------------
// extracted: per-Y conversion
// ---------------------------------------------------------------------------

describe("extracted — Y conversion", () => {
  it("converts per action to per step and per material", () => {
    const ctx = makeExtractionContext({
      modifiers: makeSkillModifiers({ noMaterialsConsumed: 0.2 }),
    });
    expect(extracted("xp", "action", ctx)).toBe(50);
    expect(extracted("xp", "step", ctx)).toBe(5);
    expect(extracted("xp", "material", ctx)).toBeCloseTo(50 / 0.8, 10);
  });

  it("counts per completion: a double action's bonus action is free", () => {
    const ctx = makeExtractionContext({ modifiers: makeSkillModifiers({ doubleAction: 0.25 }) });
    expect(extracted("xp", "action", ctx)).toBeCloseTo(50 * 1.25, 10);
    expect(extracted("rewardRolls", "action", ctx)).toBeCloseTo(1.25, 10);
  });

  it("double rewards doesn't change xp per material", () => {
    const withoutDr = makeExtractionContext({
      modifiers: makeSkillModifiers({ noMaterialsConsumed: 0.25 }),
    });
    const withDr = makeExtractionContext({
      modifiers: makeSkillModifiers({ noMaterialsConsumed: 0.25, doubleRewards: 0.5 }),
    });
    expect(extracted("xp", "material", withDr)).toBe(extracted("xp", "material", withoutDr));
  });

  it("reward rolls per material equals craftsPerMaterial", () => {
    const modifiers = makeSkillModifiers({
      doubleRewards: 0.5,
      noMaterialsConsumed: 0.25,
      craftsPerMaterial: 1.5 / 0.75,
    });
    const ctx = makeExtractionContext({ modifiers });
    expect(extracted("rewardRolls", "material", ctx)).toBeCloseTo(modifiers.craftsPerMaterial, 10);
  });
});

// ---------------------------------------------------------------------------
// extracted: per-X values
// ---------------------------------------------------------------------------

describe("extracted — X values per action", () => {
  it("reward rolls = 1 + double rewards", () => {
    const ctx = makeExtractionContext({ modifiers: makeSkillModifiers({ doubleRewards: 0.5 }) });
    expect(extracted("rewardRolls", "action", ctx)).toBe(1.5);
    expect(extracted("rewardRolls", "step", ctx)).toBeCloseTo(0.15, 10);
  });

  it("fine materials = reward rolls × fine chance", () => {
    const ctx = makeExtractionContext({
      modifiers: makeSkillModifiers({ doubleRewards: 1, fineMaterialFind: 0.02 }),
    });
    expect(extracted("fineMaterials", "action", ctx)).toBeCloseTo(0.04, 10);
  });

  it("collectibles = reward rolls × find collectibles", () => {
    const ctx = makeExtractionContext({ modifiers: makeSkillModifiers({ findCollectibles: 1.2 }) });
    expect(extracted("collectibles", "action", ctx)).toBeCloseTo(1.2, 10);
  });

  it("chests = reward rolls × chest find × chests per roll", () => {
    const ctx = makeExtractionContext({
      modifiers: makeSkillModifiers({ chestFind: 1.5 }),
      drops: makeDropProfile({ chestsPerRoll: 0.002 }),
    });
    expect(extracted("chests", "action", ctx)).toBeCloseTo(0.003, 10);
    expect(extracted("chests", "step", ctx)).toBeCloseTo(0.0003, 10);
  });

  it("chest find only scales chests from chest tables", () => {
    const ctx = makeExtractionContext({
      modifiers: makeSkillModifiers({ chestFind: 2 }),
      drops: makeDropProfile({ chestsPerRoll: 0.002, unscaledChestsPerRoll: 0.001 }),
    });
    expect(extracted("chests", "action", ctx)).toBeCloseTo(0.002 * 2 + 0.001, 10);
  });

  it("tokens add the fine bonus scaled by fine chance", () => {
    const ctx = makeExtractionContext({
      drops: makeDropProfile({ tokenBasePerRoll: 0.1, tokenFineBonusPerRoll: 2 }),
    });
    expect(extracted("tokens", "action", ctx)).toBeCloseTo(0.12, 10);
  });

  it("eternal crafts per material matches 1 / materialsNeeded", () => {
    const modifiers = makeSkillModifiers({
      qualityOutcome: 300,
      doubleRewards: 0.5,
      noMaterialsConsumed: 0.25,
    });
    const ctx = makeExtractionContext({
      modifiers,
      quality: { levelReq: 50, fineMode: "none" },
    });
    const odds = getOutcomeOdds(50, 300, "none", 1.5 / 0.75);
    expect(extracted("eternalCrafts", "material", ctx)).toBeCloseTo(
      1 / odds[odds.length - 1].materialsNeeded,
      10,
    );
  });

  it("only counts XP for the activity's skills", () => {
    const ctx = makeExtractionContext({
      modifiers: makeSkillModifiers({
        xpRewards: [
          { skill: "fishing", skillText: "fishing", base: 50, value: 60 },
          { skill: "mining", skillText: "mining", base: 0, value: 5 },
          { skill: "xp", skillText: "total", base: 50, value: 65 },
        ],
      }),
    });
    expect(extracted("xp", "action", ctx)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// extracted: guards
// ---------------------------------------------------------------------------

describe("extracted — guards", () => {
  it("returns 0 when the activity gives no XP", () => {
    const ctx = makeExtractionContext({ modifiers: makeSkillModifiers({ xpRewards: [] }) });
    expect(extracted("xp", "step", ctx)).toBe(0);
  });

  it("returns 0 for eternal crafts without quality inputs", () => {
    expect(extracted("eternalCrafts", "material", makeExtractionContext())).toBe(0);
  });

  it("returns 0 per material when no materials are ever consumed", () => {
    const ctx = makeExtractionContext({ modifiers: makeSkillModifiers({ noMaterialsConsumed: 1 }) });
    expect(extracted("rewardRolls", "material", ctx)).toBe(0);
  });

  it("returns 0 per step when there is no step cost", () => {
    const ctx = makeExtractionContext({ modifiers: makeSkillModifiers({ stepsPerAction: 0 }) });
    expect(extracted("xp", "step", ctx)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildDropProfile
// ---------------------------------------------------------------------------

describe("buildDropProfile", () => {
  const dropMap = {
    small_chest: { stepsPerItem: 500, stepsPerFine: 0 },
    adventurers_guild_token: { stepsPerItem: 100, stepsPerFine: 0 },
    pin: { stepsPerItem: 50, stepsPerFine: 50 },
    never_drops: { stepsPerItem: Infinity, stepsPerFine: 0 },
  };
  const containers = { small_chest: {} };
  const tokens = { adventurers_guild_token: { common: 1 }, pin: { common: 2, fine: 10 } };

  it("sums chests and token values per roll", () => {
    const profile = buildDropProfile(dropMap, { small_chest: dropMap.small_chest }, containers, tokens);
    expect(profile.chestsPerRoll).toBeCloseTo(0.002, 10);
    expect(profile.unscaledChestsPerRoll).toBeCloseTo(0, 10);
    expect(profile.tokenBasePerRoll).toBeCloseTo(0.01 * 1 + 0.02 * 2, 10);
    expect(profile.tokenFineBonusPerRoll).toBeCloseTo(0.02 * (10 - 2), 10);
  });

  it("keeps chests from other tables out of the chest-find-scaled rate", () => {
    const profile = buildDropProfile(dropMap, {}, containers, tokens);
    expect(profile.chestsPerRoll).toBe(0);
    expect(profile.unscaledChestsPerRoll).toBeCloseTo(0.002, 10);
  });

  it("returns an empty profile for no drops", () => {
    expect(buildDropProfile({}, {}, containers, tokens)).toEqual(makeDropProfile());
  });

  it("gives the same token value as the drops panel's materialValue", () => {
    const profile = buildDropProfile({ pin: dropMap.pin }, {}, {}, tokens);
    const stepsPerRewardRoll = 10;
    const fine = 0.05;
    const ctx = makeExtractionContext({
      modifiers: makeSkillModifiers({ stepsPerAction: stepsPerRewardRoll, fineMaterialFind: fine }),
      drops: profile,
    });

    // The drops panel works per 1000 steps from the pin's real step counts.
    const stepsPerItem = dropMap.pin.stepsPerItem * stepsPerRewardRoll;
    const panelValue = materialValue(
      "pin",
      { stepsPerNormal: stepsPerItem / (1 - fine), stepsPerFine: stepsPerItem / fine },
      tokens,
    );

    expect(extracted("tokens", "step", ctx) * 1000).toBeCloseTo(panelValue!, 10);
  });
});
