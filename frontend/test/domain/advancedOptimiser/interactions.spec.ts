import { describe, it, expect } from "vitest";
import { calculateSkillModifiers } from "@/domain/skillModifiers";
import { extracted } from "@/domain/advancedOptimiser/targets";
import type { XValue, YValue } from "@/domain/advancedOptimiser/config";
import { makeExtractionContext, makeStatTotals } from "../../fixtures/advancedOptimiser";

// Items whose value depends on the rest of the gear set. Extraction must be
// done on the whole set's modifiers for these to come out right.

const source = { maxWorkEfficiency: 2, workRequired: 100, xpRewardsMap: { fishing: 50 } };

const valueWith = (
  x: XValue,
  y: YValue,
  sums: Parameters<typeof makeStatTotals>[0],
): number => {
  const modifiers = calculateSkillModifiers(makeStatTotals(sums), source, true);
  return extracted(x, y, makeExtractionContext({ modifiers }));
};

describe("work efficiency cap trade-off (−WE / +double action item)", () => {
  const item = { workEfficiency: -0.25, doubleAction: 0.2 };

  it("is worth equipping once work efficiency is overcapped", () => {
    const without = valueWith("xp", "step", { workEfficiency: { percent: 1.5 } });
    const withItem = valueWith("xp", "step", {
      workEfficiency: { percent: 1.5 + item.workEfficiency },
      doubleAction: { percent: item.doubleAction },
    });
    expect(withItem).toBeGreaterThan(without);
  });

  it("is worse than nothing at base work efficiency", () => {
    const without = valueWith("xp", "step", {});
    const withItem = valueWith("xp", "step", {
      workEfficiency: { percent: item.workEfficiency },
      doubleAction: { percent: item.doubleAction },
    });
    expect(withItem).toBeLessThan(without);
  });
});

describe("no materials consumed has increasing returns", () => {
  const gain = (from: number): number =>
    valueWith("rewardRolls", "material", { noMaterialsConsumed: { percent: from + 0.1 } }) -
    valueWith("rewardRolls", "material", { noMaterialsConsumed: { percent: from } });

  it("+10% is worth more at 60% than at 0%", () => {
    expect(gain(0.6)).toBeGreaterThan(gain(0));
  });
});

describe("per-action targets ignore step cost", () => {
  it("work efficiency doesn't change reward rolls per action", () => {
    expect(valueWith("rewardRolls", "action", { workEfficiency: { percent: 0.5 } })).toBe(
      valueWith("rewardRolls", "action", {}),
    );
  });
});
