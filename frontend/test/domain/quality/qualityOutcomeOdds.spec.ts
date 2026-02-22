import { describe, it, expect } from "vitest";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";

describe("getOutcomeOdds", () => {
  describe("without fine materials", () => {
    it("returns 6 quality tiers", () => {
      const result = getOutcomeOdds(1, 0, false);
      expect(result).toHaveLength(6);
    });

    it("probabilities sum to 1", () => {
      const result = getOutcomeOdds(50, 300, false);
      const total = result.reduce((acc, r) => acc + r.value, 0);
      expect(total).toBeCloseTo(1, 10);
    });

    it("crafts equals inverse of probability for each tier", () => {
      const result = getOutcomeOdds(10, 150, false);
      for (const tier of result) {
        expect(tier.crafts).toBeCloseTo(1 / tier.value, 10);
      }
    });

    it("first tier is Normal at low quality outcome", () => {
      const result = getOutcomeOdds(1, 0, false);
      expect(result[0].name).toBe("Normal");
      expect(result[0].qualityValue).toBe("common");
    });

    it("lower tiers have probability >= higher tiers (monotonicity)", () => {
      const result = getOutcomeOdds(50, 200, false);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].value).toBeGreaterThanOrEqual(result[i + 1].value);
      }
    });

    it("higher quality outcome increases probability of better tiers", () => {
      const lowQO = getOutcomeOdds(50, 0, false);
      const highQO = getOutcomeOdds(50, 500, false);
      // Eternal tier should become more likely with higher quality outcome
      const eternalIndex = lowQO.findIndex((r) => r.name === "Eternal");
      expect(highQO[eternalIndex].value).toBeGreaterThan(
        lowQO[eternalIndex].value
      );
    });

    it("Normal has highest probability at minimal quality outcome", () => {
      const result = getOutcomeOdds(1, 0, false);
      const maxValue = Math.max(...result.map((r) => r.value));
      expect(result[0].value).toBe(maxValue);
    });

    it("quality tier names and values match expected order", () => {
      const result = getOutcomeOdds(1, 0, false);
      const expected = [
        { name: "Normal", qualityValue: "common" },
        { name: "Good", qualityValue: "uncommon" },
        { name: "Great", qualityValue: "rare" },
        { name: "Excellent", qualityValue: "epic" },
        { name: "Perfect", qualityValue: "legendary" },
        { name: "Eternal", qualityValue: "ethereal" },
      ];
      expected.forEach((exp, i) => {
        expect(result[i].name).toBe(exp.name);
        expect(result[i].qualityValue).toBe(exp.qualityValue);
      });
    });
  });

  describe("with fine materials", () => {
    it("returns 5 quality tiers (Normal removed)", () => {
      const result = getOutcomeOdds(1, 0, true);
      expect(result).toHaveLength(5);
    });

    it("does not include Normal quality tier", () => {
      const result = getOutcomeOdds(1, 0, true);
      expect(result.find((r) => r.name === "Normal")).toBeUndefined();
      expect(result.find((r) => r.qualityValue === "common")).toBeUndefined();
    });

    it("first tier is Good when fine materials are used", () => {
      const result = getOutcomeOdds(1, 0, true);
      expect(result[0].name).toBe("Good");
      expect(result[0].qualityValue).toBe("uncommon");
    });

    it("last tier is Eternal", () => {
      const result = getOutcomeOdds(1, 0, true);
      expect(result[result.length - 1].name).toBe("Eternal");
      expect(result[result.length - 1].qualityValue).toBe("ethereal");
    });

    it("probabilities sum to 1", () => {
      const result = getOutcomeOdds(50, 300, true);
      const total = result.reduce((acc, r) => acc + r.value, 0);
      expect(total).toBeCloseTo(1, 10);
    });

    it("lower tiers have probability >= higher tiers (monotonicity)", () => {
      const result = getOutcomeOdds(50, 200, true);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].value).toBeGreaterThanOrEqual(result[i + 1].value);
      }
    });

    it("Eternal probability is higher with fine materials than without at same inputs", () => {
      const withFine = getOutcomeOdds(50, 100, true);
      const withoutFine = getOutcomeOdds(50, 100, false);
      const eternalWithFine = withFine.find((r) => r.name === "Eternal")!;
      const eternalWithoutFine = withoutFine.find((r) => r.name === "Eternal")!;
      expect(eternalWithFine.value).toBeGreaterThan(eternalWithoutFine.value);
    });
  });
});
