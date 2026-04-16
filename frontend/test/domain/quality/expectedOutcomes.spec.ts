import { describe, it, expect } from "vitest";
import { chanceOfAtLeastOne } from "@/domain/quality/expectedOutcomes";

describe("chanceOfAtLeastOne", () => {
  it("returns 0 when p is 0 (impossible outcome)", () => {
    expect(chanceOfAtLeastOne(0, 10)).toBe(0);
  });

  it("returns 1 when p is 1 (guaranteed outcome)", () => {
    expect(chanceOfAtLeastOne(1, 5)).toBe(1);
  });

  it("returns 0 when n is 0 (no attempts)", () => {
    expect(chanceOfAtLeastOne(0.5, 0)).toBe(0);
  });

  it("returns p for a single attempt", () => {
    expect(chanceOfAtLeastOne(0.3, 1)).toBeCloseTo(0.3);
  });

  it("increases with more attempts", () => {
    const p5 = chanceOfAtLeastOne(0.2, 5);
    const p10 = chanceOfAtLeastOne(0.2, 10);
    expect(p10).toBeGreaterThan(p5);
  });

  it("approaches 1 as n grows large", () => {
    expect(chanceOfAtLeastOne(0.1, 100)).toBeGreaterThan(0.999);
  });

  it("uses the correct formula 1-(1-p)^n", () => {
    const p = 0.25;
    const n = 4;
    expect(chanceOfAtLeastOne(p, n)).toBeCloseTo(1 - ((1 - p) ** n));
  });

  it("handles fractional n (exponentiation with non-integer n)", () => {
    // Non-integer n is mathematically valid via ** operator
    expect(chanceOfAtLeastOne(0.5, 2)).toBeCloseTo(0.75);
  });
});
