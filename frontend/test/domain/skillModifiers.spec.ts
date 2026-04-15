import { describe, it, expect } from "vitest";
import {
  calculateSkillModifiers,
  type SkillModifiersSource,
} from "@/domain/skillModifiers";
import { makeStatTotals, emptyStatTotals } from "../fixtures/statTotals";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSource(
  overrides: Partial<SkillModifiersSource> = {},
): SkillModifiersSource {
  return {
    maxWorkEfficiency: 2,
    workRequired: 100,
    xpRewardsMap: { fishing: 50 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Null source
// ---------------------------------------------------------------------------

describe("calculateSkillModifiers — null source", () => {
  it("returns sensible defaults with empty totals and null source", () => {
    const result = calculateSkillModifiers(emptyStatTotals, null, true);
    expect(result.maxWorkEfficiency).toBe(1);
    expect(result.workEfficiency).toBe(1);
    expect(result.stepsPerCompletion).toBe(10);
    expect(result.xpRewards).toEqual([]);
    expect(result.xpPerStep).toEqual([]);
  });

  it("find modifiers default to 1 with empty totals", () => {
    const result = calculateSkillModifiers(emptyStatTotals, null, true);
    expect(result.findCollectibles).toBe(1);
    expect(result.findGems).toBe(1);
    expect(result.findBirdNests).toBe(1);
    expect(result.chestFind).toBe(1);
  });

  it("chance modifiers default to 0 with empty totals", () => {
    const result = calculateSkillModifiers(emptyStatTotals, null, true);
    expect(result.doubleAction).toBe(0);
    expect(result.doubleRewards).toBe(0);
    expect(result.noMaterialsConsumed).toBe(0);
    expect(result.qualityOutcome).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Work efficiency
// ---------------------------------------------------------------------------

describe("calculateSkillModifiers — work efficiency", () => {
  it("workEfficiency is capped at maxWorkEfficiency", () => {
    const totals = makeStatTotals({ workEfficiency: { percent: 5.0 } }); // +500%
    const result = calculateSkillModifiers(
      totals,
      makeSource({ maxWorkEfficiency: 2 }),
      true,
    );
    expect(result.workEfficiency).toBe(2);
    expect(result.uncappedWorkEfficiency).toBe(6);
  });

  it("workEfficiency equals 1 + percent stat when below cap", () => {
    const totals = makeStatTotals({ workEfficiency: { percent: 0.5 } }); // +50%
    const result = calculateSkillModifiers(
      totals,
      makeSource({ maxWorkEfficiency: 3 }),
      true,
    );
    expect(result.workEfficiency).toBeCloseTo(1.5);
    expect(result.uncappedWorkEfficiency).toBeCloseTo(1.5);
  });

  it("effectiveMaxWorkEfficiency is workRequired / minSteps", () => {
    // workRequired=110, maxWorkEfficiency=2.1 → minSteps=ceil(110/2.1)=53 → effective=110/53≈2.075
    const result = calculateSkillModifiers(
      emptyStatTotals,
      makeSource({ maxWorkEfficiency: 2.1, workRequired: 110 }),
      true,
    );
    expect(result.effectiveMaxWorkEfficiency).toBeCloseTo(110 / 53);
  });
});

// ---------------------------------------------------------------------------
// Steps per completion — minimum of 10
// ---------------------------------------------------------------------------

describe("calculateSkillModifiers — steps per completion", () => {
  it("stepsPerCompletion is at least 10", () => {
    // Very high workEfficiency makes rawSteps tiny → clamped to 10
    const totals = makeStatTotals({ workEfficiency: { percent: 999 } });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ maxWorkEfficiency: 1000, workRequired: 1 }),
      true,
    );
    expect(result.stepsPerCompletion).toBeGreaterThanOrEqual(10);
  });

  it("stepsPerCompletion reflects actual calculation when above minimum", () => {
    // workRequired=100, workEfficiency=1 (no bonus), percent modifier=1 → steps=100
    const result = calculateSkillModifiers(
      emptyStatTotals,
      makeSource({ maxWorkEfficiency: 2, workRequired: 100 }),
      true,
    );
    expect(result.stepsPerCompletion).toBe(100);
  });

  it("stepsRequiredPercent increases stepsPerCompletion", () => {
    // +100% steps required → steps double
    const totals = makeStatTotals({ stepsRequired: { percent: 1.0 } });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100, maxWorkEfficiency: 2 }),
      true,
    );
    // rawSteps = ceil(100/1 * 2) + 0 = 200
    expect(result.stepsPerCompletion).toBe(200);
  });

  it("negative stepsRequiredPercent reduces stepsPerCompletion", () => {
    // -50% steps required → steps halved (but still rounded up)
    const totals = makeStatTotals({ stepsRequired: { percent: -0.5 } });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 101, maxWorkEfficiency: 2 }),
      true,
    );
    expect(result.stepsPerCompletion).toBe(51);
  });

  it("stepsRequiredFlat adds flat amount to stepsPerCompletion", () => {
    const totals = makeStatTotals({ stepsRequired: { flat: 50 } });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100, maxWorkEfficiency: 2 }),
      true,
    );
    // rawSteps = ceil(100/1*1) + 50 = 150
    expect(result.stepsPerCompletion).toBe(150);
  });

  it("negative stepsRequiredFlat subtracts flat amount from stepsPerCompletion", () => {
    const totals = makeStatTotals({ stepsRequired: { flat: -30 } });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100, maxWorkEfficiency: 2 }),
      true,
    );
    expect(result.stepsPerCompletion).toBe(70);
  });

  it("stepsRequiredFlat can reduce stepsPerCompletion below what work efficiency cap would allow", () => {
    const totals = makeStatTotals({
      stepsRequired: { flat: -5 },
      workEfficiency: { percent: 5.0 },
    });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100, maxWorkEfficiency: 2 }),
      true,
    );
    // workEfficiency would cap at 2 → rawSteps=50, but flat -5 reduces to 45
    expect(result.stepsPerCompletion).toBe(45);
  });

  it("stepsRequiredPercent can reduce stepsPerCompletion below what work efficiency cap would allow", () => {
    const totals = makeStatTotals({
      stepsRequired: { percent: -0.5 },
      workEfficiency: { percent: 5.0 },
    });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100, maxWorkEfficiency: 2 }),
      true,
    );
    // workEfficiency would cap at 2 → rawSteps=50, but -50% reduces to 25
    expect(result.stepsPerCompletion).toBe(25);
  });

  it("stepsRequired modifiers cannot reduce stepsPerCompletion below 10", () => {
    const totals = makeStatTotals({
      stepsRequired: { percent: -0.9, flat: -50 },
      workEfficiency: { percent: 5.0 },
    });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100, maxWorkEfficiency: 2 }),
      true,
    );
    // workEfficiency would cap at 2 → rawSteps=50, but -90% would reduce to 5, flat -50 would reduce to -45, clamped to minimum of 10
    expect(result.stepsPerCompletion).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// XP rewards
// ---------------------------------------------------------------------------

describe("calculateSkillModifiers — XP rewards", () => {
  it("reads xpRewardsMap when activitySelected=true", () => {
    const source = makeSource({
      xpRewardsMap: { fishing: 80 },
      xpRewards: undefined,
    });
    const result = calculateSkillModifiers(emptyStatTotals, source, true);
    expect(result.xpRewards).toHaveLength(1);
    expect(result.xpRewards[0].skill).toBe("fishing");
    expect(result.xpRewards[0].base).toBe(80);
  });

  it("reads xpRewards when activitySelected=false", () => {
    const source = makeSource({
      xpRewardsMap: undefined,
      xpRewards: { crafting: 60 },
    });
    const result = calculateSkillModifiers(emptyStatTotals, source, false);
    expect(result.xpRewards).toHaveLength(1);
    expect(result.xpRewards[0].skill).toBe("crafting");
  });

  it("does not add total row when only one skill is rewarded", () => {
    const source = makeSource({ xpRewardsMap: { fishing: 50 } });
    const result = calculateSkillModifiers(emptyStatTotals, source, true);
    expect(result.xpRewards).toHaveLength(1);
    expect(
      result.xpRewards.find((r) => r.skillText === "total"),
    ).toBeUndefined();
  });

  it("adds total row when more than one skill is rewarded", () => {
    const source = makeSource({ xpRewardsMap: { fishing: 50, agility: 30 } });
    const result = calculateSkillModifiers(emptyStatTotals, source, true);
    expect(result.xpRewards.length).toBeGreaterThan(2);
    const total = result.xpRewards.find((r) => r.skillText === "total");
    expect(total).toBeDefined();
    expect(total!.base).toBe(80);
  });

  it("bonusExperience percent scales XP value", () => {
    const totals = makeStatTotals({ bonusExperience: { percent: 0.5 } }); // +50% XP
    const source = makeSource({ xpRewardsMap: { fishing: 100 } });
    const result = calculateSkillModifiers(totals, source, true);
    expect(result.xpRewards[0].value).toBeCloseTo(150);
  });

  it("bonusExperience flat adds to base before applying percent", () => {
    const totals = makeStatTotals({ bonusExperience: { flat: 10 } });
    const source = makeSource({ xpRewardsMap: { fishing: 100 } });
    const result = calculateSkillModifiers(totals, source, true);
    expect(result.xpRewards[0].value).toBeCloseTo(110);
  });

  it("skill-specific bonusExperience flat adds to existing skill", () => {
    const totals = makeStatTotals({ "bonusExperience:fishing": { flat: 20 } });
    const source = makeSource({ xpRewardsMap: { fishing: 100 } });
    const result = calculateSkillModifiers(totals, source, true);
    expect(result.xpRewards[0].base).toBe(120);
  });

  it("skill-specific bonus for a skill not in xpRewardsMap creates new entry", () => {
    const totals = makeStatTotals({ "bonusExperience:mining": { flat: 15 } });
    const source = makeSource({ xpRewardsMap: { fishing: 50 } });
    const result = calculateSkillModifiers(totals, source, true);
    const mining = result.xpRewards.find((r) => r.skill === "mining");
    expect(mining).toBeDefined();
    expect(mining!.value).toBeCloseTo(15);
  });
});

// ---------------------------------------------------------------------------
// Find and chance modifiers
// ---------------------------------------------------------------------------

describe("calculateSkillModifiers — find and chance modifiers", () => {
  it("doubleAction is capped at 1", () => {
    const totals = makeStatTotals({ doubleAction: { percent: 5.0 } }); // +500%
    const result = calculateSkillModifiers(totals, makeSource(), true);
    expect(result.doubleAction).toBe(1);
  });

  it("doubleRewards is capped at 1", () => {
    const totals = makeStatTotals({ doubleRewards: { percent: 10 } });
    const result = calculateSkillModifiers(totals, makeSource(), true);
    expect(result.doubleRewards).toBe(1);
  });

  it("noMaterialsConsumed is capped at 1", () => {
    const totals = makeStatTotals({ noMaterialsConsumed: { percent: 2.0 } });
    const result = calculateSkillModifiers(totals, makeSource(), true);
    expect(result.noMaterialsConsumed).toBe(1);
  });

  it("findCollectibles is 1 + percent stat", () => {
    const totals = makeStatTotals({ findCollectibles: { percent: 0.5 } });
    const result = calculateSkillModifiers(totals, makeSource(), true);
    expect(result.findCollectibles).toBeCloseTo(1.5);
  });

  it("fineMaterialFind is (1 + percent) / 100", () => {
    const totals = makeStatTotals({ fineMaterialFind: { percent: 0 } });
    const result = calculateSkillModifiers(totals, makeSource(), true);
    expect(result.fineMaterialFind).toBeCloseTo(1 / 100);
  });

  it("qualityOutcome reads flat stat", () => {
    const totals = makeStatTotals({ qualityOutcome: { flat: 5 } });
    const result = calculateSkillModifiers(totals, makeSource(), true);
    expect(result.qualityOutcome).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Derived step rates
// ---------------------------------------------------------------------------

describe("calculateSkillModifiers — derived step rates", () => {
  it("stepsPerAction = stepsPerCompletion / (1 + doubleAction)", () => {
    const totals = makeStatTotals({ doubleAction: { percent: 1.0 } }); // capped → 1.0
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100 }),
      true,
    );
    expect(result.stepsPerAction).toBeCloseTo(result.stepsPerCompletion / 2);
  });

  it("stepsPerRewardRoll = stepsPerAction / (1 + doubleRewards)", () => {
    const totals = makeStatTotals({
      doubleAction: { percent: 1.0 },
      doubleRewards: { percent: 1.0 },
    });
    const result = calculateSkillModifiers(
      totals,
      makeSource({ workRequired: 100 }),
      true,
    );
    expect(result.stepsPerRewardRoll).toBeCloseTo(
      result.stepsPerCompletion / 4,
    );
  });
});
