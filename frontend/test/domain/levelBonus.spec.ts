import { describe, it, expect } from "vitest";
import {
  calculateWorkEfficiencyBonus,
  calculateQualityOutcomeBonus,
  buildWorkEfficiencyBonusAttr,
  buildQualityOutcomeBonusAttr,
} from "@/domain/levelBonus";
import {
  EFFICIENCY_PER_LEVEL,
  TRAVELLING_EFFICIENCY_PER_LEVEL,
  EFFICIENCY_MAX_LEVEL_CAP,
} from "@/domain/constants/levelBonus";

// ---------------------------------------------------------------------------
// calculateWorkEfficiencyBonus
// ---------------------------------------------------------------------------

describe("calculateWorkEfficiencyBonus", () => {
  describe("non-travelling", () => {
    it("returns 0 when player is at exact requirement level", () => {
      expect(
        calculateWorkEfficiencyBonus({
          playerLevel: 10,
          levelRequirement: 10,
          isTravelling: false,
        }),
      ).toBe(0);
    });

    it("returns 0 when player is below requirement level", () => {
      expect(
        calculateWorkEfficiencyBonus({
          playerLevel: 5,
          levelRequirement: 10,
          isTravelling: false,
        }),
      ).toBe(0);
    });

    it("returns EFFICIENCY_PER_LEVEL * levelsAbove for levels within cap", () => {
      const levelsAbove = 5;
      const result = calculateWorkEfficiencyBonus({
        playerLevel: 10 + levelsAbove,
        levelRequirement: 10,
        isTravelling: false,
      });
      expect(result).toBeCloseTo(levelsAbove * EFFICIENCY_PER_LEVEL);
    });

    it("caps at EFFICIENCY_MAX_LEVEL_CAP levels above requirement", () => {
      const atCap = calculateWorkEfficiencyBonus({
        playerLevel: 10 + EFFICIENCY_MAX_LEVEL_CAP,
        levelRequirement: 10,
        isTravelling: false,
      });
      const beyondCap = calculateWorkEfficiencyBonus({
        playerLevel: 10 + EFFICIENCY_MAX_LEVEL_CAP + 10,
        levelRequirement: 10,
        isTravelling: false,
      });
      expect(atCap).toBeCloseTo(EFFICIENCY_MAX_LEVEL_CAP * EFFICIENCY_PER_LEVEL);
      expect(beyondCap).toBe(atCap);
    });
  });

  describe("travelling", () => {
    it("returns 0 when player is at exact requirement level", () => {
      expect(
        calculateWorkEfficiencyBonus({
          playerLevel: 10,
          levelRequirement: 10,
          isTravelling: true,
        }),
      ).toBe(0);
    });

    it("returns TRAVELLING_EFFICIENCY_PER_LEVEL * levelsAbove", () => {
      const levelsAbove = 10;
      const result = calculateWorkEfficiencyBonus({
        playerLevel: 10 + levelsAbove,
        levelRequirement: 10,
        isTravelling: true,
      });
      expect(result).toBeCloseTo(levelsAbove * TRAVELLING_EFFICIENCY_PER_LEVEL);
    });

    it("is not capped at EFFICIENCY_MAX_LEVEL_CAP unlike non-travelling", () => {
      // Choose levels far enough above that travelling (uncapped) > non-travelling (capped at 20 levels).
      // Non-travelling max = 20 * 0.0125 = 0.25. Travelling exceeds this at >50 levels above.
      const farAbove = EFFICIENCY_MAX_LEVEL_CAP + 60; // 80 levels above
      const travelling = calculateWorkEfficiencyBonus({
        playerLevel: 1 + farAbove,
        levelRequirement: 1,
        isTravelling: true,
      });
      const nonTravelling = calculateWorkEfficiencyBonus({
        playerLevel: 1 + farAbove,
        levelRequirement: 1,
        isTravelling: false,
      });
      expect(travelling).toBeGreaterThan(nonTravelling);
    });

    it("travelling rate is lower than non-travelling rate per level (within cap)", () => {
      const levelsAbove = 5;
      const travelling = calculateWorkEfficiencyBonus({
        playerLevel: 10 + levelsAbove,
        levelRequirement: 10,
        isTravelling: true,
      });
      const nonTravelling = calculateWorkEfficiencyBonus({
        playerLevel: 10 + levelsAbove,
        levelRequirement: 10,
        isTravelling: false,
      });
      expect(travelling).toBeLessThan(nonTravelling);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateQualityOutcomeBonus
// ---------------------------------------------------------------------------

describe("calculateQualityOutcomeBonus", () => {
  it("returns 0 when player is at exact requirement level", () => {
    expect(
      calculateQualityOutcomeBonus({ playerLevel: 20, levelRequirement: 20 }),
    ).toBe(0);
  });

  it("returns 0 when player is below requirement", () => {
    expect(
      calculateQualityOutcomeBonus({ playerLevel: 15, levelRequirement: 20 }),
    ).toBe(0);
  });

  it("returns levelsAbove as integer bonus", () => {
    expect(
      calculateQualityOutcomeBonus({ playerLevel: 25, levelRequirement: 20 }),
    ).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// buildWorkEfficiencyBonusAttr
// ---------------------------------------------------------------------------

describe("buildWorkEfficiencyBonusAttr", () => {
  it("returns an attr with the correct id", () => {
    const attr = buildWorkEfficiencyBonusAttr(0.25);
    expect(attr.id).toBe("work_efficiency_bonus");
  });

  it("embeds the value in the stat", () => {
    const attr = buildWorkEfficiencyBonusAttr(0.5);
    expect(attr.stats).toHaveLength(1);
    expect(attr.stats[0].value).toBe(0.5);
  });

  it("stat type is workEfficiency and isPercent is true", () => {
    const attr = buildWorkEfficiencyBonusAttr(0.1);
    expect(attr.stats[0].type).toBe("workEfficiency");
    expect(attr.stats[0].isPercent).toBe(true);
  });

  it("has empty requirements and null tables", () => {
    const attr = buildWorkEfficiencyBonusAttr(0);
    expect(attr.requirements).toEqual([]);
    expect(attr.tables).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildQualityOutcomeBonusAttr
// ---------------------------------------------------------------------------

describe("buildQualityOutcomeBonusAttr", () => {
  it("returns an attr with the correct id", () => {
    const attr = buildQualityOutcomeBonusAttr(3);
    expect(attr.id).toBe("quality_outcome_bonus");
  });

  it("embeds the value in the stat", () => {
    const attr = buildQualityOutcomeBonusAttr(7);
    expect(attr.stats).toHaveLength(1);
    expect(attr.stats[0].value).toBe(7);
  });

  it("stat type is qualityOutcome and isPercent is false", () => {
    const attr = buildQualityOutcomeBonusAttr(1);
    expect(attr.stats[0].type).toBe("qualityOutcome");
    expect(attr.stats[0].isPercent).toBe(false);
  });

  it("has empty requirements and null tables", () => {
    const attr = buildQualityOutcomeBonusAttr(0);
    expect(attr.requirements).toEqual([]);
    expect(attr.tables).toBeNull();
  });
});
