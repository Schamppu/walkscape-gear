import { describe, it, expect } from "vitest";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";

describe("getOutcomeOdds", () => {
  describe("without fine materials", () => {
    it("returns 6 quality tiers", () => {
      const result = getOutcomeOdds(1, 0, "none");
      expect(result).toHaveLength(6);
    });

    it("probabilities sum to 1", () => {
      const result = getOutcomeOdds(50, 300, "none");
      const total = result.reduce((acc, r) => acc + r.value, 0);
      expect(total).toBeCloseTo(1, 10);
    });

    it("crafts equals inverse of probability for each tier", () => {
      const result = getOutcomeOdds(10, 150, "none");
      for (const tier of result) {
        expect(tier.crafts).toBeCloseTo(1 / tier.value, 10);
      }
    });

    it("first tier is Normal at low quality outcome", () => {
      const result = getOutcomeOdds(1, 0, "none");
      expect(result[0].name).toBe("Normal");
      expect(result[0].qualityValue).toBe("common");
    });

    it("lower tiers have probability >= higher tiers (monotonicity)", () => {
      const result = getOutcomeOdds(50, 200, "none");
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].value).toBeGreaterThanOrEqual(result[i + 1].value);
      }
    });

    it("higher quality outcome increases probability of better tiers", () => {
      const lowQO = getOutcomeOdds(50, 0, "none");
      const highQO = getOutcomeOdds(50, 500, "none");
      // Eternal tier should become more likely with higher quality outcome
      const eternalIndex = lowQO.findIndex((r) => r.name === "Eternal");
      expect(highQO[eternalIndex].value).toBeGreaterThan(
        lowQO[eternalIndex].value
      );
    });

    it("Normal has highest probability at minimal quality outcome", () => {
      const result = getOutcomeOdds(1, 0, "none");
      const maxValue = Math.max(...result.map((r) => r.value));
      expect(result[0].value).toBe(maxValue);
    });

    it("quality tier names and values match expected order", () => {
      const result = getOutcomeOdds(1, 0, "none");
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
      const result = getOutcomeOdds(1, 0, "all");
      expect(result).toHaveLength(5);
    });

    it("does not include Normal quality tier", () => {
      const result = getOutcomeOdds(1, 0, "all");
      expect(result.find((r) => r.name === "Normal")).toBeUndefined();
      expect(result.find((r) => r.qualityValue === "common")).toBeUndefined();
    });

    it("first tier is Good when fine materials are used", () => {
      const result = getOutcomeOdds(1, 0, "all");
      expect(result[0].name).toBe("Good");
      expect(result[0].qualityValue).toBe("uncommon");
    });

    it("last tier is Eternal", () => {
      const result = getOutcomeOdds(1, 0, "all");
      expect(result[result.length - 1].name).toBe("Eternal");
      expect(result[result.length - 1].qualityValue).toBe("ethereal");
    });

    it("probabilities sum to 1", () => {
      const result = getOutcomeOdds(50, 300, "all");
      const total = result.reduce((acc, r) => acc + r.value, 0);
      expect(total).toBeCloseTo(1, 10);
    });

    it("lower tiers have probability >= higher tiers (monotonicity)", () => {
      const result = getOutcomeOdds(50, 200, "all");
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].value).toBeGreaterThanOrEqual(result[i + 1].value);
      }
    });

    it("Eternal probability is higher with fine materials than without at same inputs", () => {
      const withFine = getOutcomeOdds(50, 100, "all");
      const withoutFine = getOutcomeOdds(50, 100, "none");
      const eternalWithFine = withFine.find((r) => r.name === "Eternal")!;
      const eternalWithoutFine = withoutFine.find((r) => r.name === "Eternal")!;
      expect(eternalWithFine.value).toBeGreaterThan(eternalWithoutFine.value);
    });
  });

  // The advanced optimiser expresses the eternal-crafts objective as
  // `eternalCrafts / material` (high-is-better), derived from the existing
  // `materialsNeeded` field via `1 / materialsNeeded`. These tests lock in
  // that inverse relationship so the extractor cannot silently drift.
  describe("inverse relation: 1 / materialsNeeded = eternal-crafts per material", () => {
    const cases: Array<{
      levelReq: number;
      qualityOutcome: number;
      fineMode: "none" | "partial" | "all";
      craftsPerMaterial: number;
    }> = [
      { levelReq: 1, qualityOutcome: 0, fineMode: "none", craftsPerMaterial: 1 },
      { levelReq: 50, qualityOutcome: 300, fineMode: "none", craftsPerMaterial: 1 },
      { levelReq: 50, qualityOutcome: 300, fineMode: "none", craftsPerMaterial: 1.5 },
      { levelReq: 50, qualityOutcome: 300, fineMode: "partial", craftsPerMaterial: 1.25 },
      { levelReq: 50, qualityOutcome: 500, fineMode: "all", craftsPerMaterial: 2 },
      { levelReq: 100, qualityOutcome: 800, fineMode: "all", craftsPerMaterial: 1 },
    ];

    it.each(cases)(
      "1 / materialsNeeded[eternal] === probability[eternal] * craftsPerMaterial for %o",
      ({ levelReq, qualityOutcome, fineMode, craftsPerMaterial }) => {
        const odds = getOutcomeOdds(levelReq, qualityOutcome, fineMode, craftsPerMaterial);
        const eternal = odds[odds.length - 1];
        expect(eternal.name).toBe("Eternal");

        const inverse = 1 / eternal.materialsNeeded;
        const direct = eternal.value * craftsPerMaterial;

        expect(inverse).toBeCloseTo(direct, 10);
      },
    );

    it("inverse matches for every tier, not just Eternal", () => {
      const odds = getOutcomeOdds(50, 300, "none", 1.5);
      for (const tier of odds) {
        expect(1 / tier.materialsNeeded).toBeCloseTo(tier.value * 1.5, 10);
      }
    });

    it("eternal-crafts-per-material increases monotonically with craftsPerMaterial", () => {
      const lowC = getOutcomeOdds(50, 300, "none", 1);
      const highC = getOutcomeOdds(50, 300, "none", 2);
      const lowEternal = 1 / lowC[lowC.length - 1].materialsNeeded;
      const highEternal = 1 / highC[highC.length - 1].materialsNeeded;
      expect(highEternal).toBeGreaterThan(lowEternal);
      expect(highEternal).toBeCloseTo(2 * lowEternal, 10);
    });
  });
});
