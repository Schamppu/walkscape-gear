import { describe, it, expect } from "vitest";
import {
  computeBaseline,
  normalise,
  shareOfBest,
  targetKey,
} from "@/domain/advancedOptimiser/normalisation";
import {
  makeExtractionContext,
  makeSkillModifiers,
  makeTarget,
} from "../../fixtures/advancedOptimiser";

describe("computeBaseline", () => {
  it("extracts each distinct target once from the naked context", () => {
    const baseline = computeBaseline(
      [makeTarget("xp", "step", 3), makeTarget("xp", "step", 7), makeTarget("xp", "action")],
      makeExtractionContext(),
    );
    expect(baseline.size).toBe(2);
    expect(baseline.get("xp/step")).toBe(5);
    expect(baseline.get("xp/action")).toBe(50);
  });
});

describe("normalise", () => {
  const target = makeTarget("xp", "step");

  it("returns candidate / baseline", () => {
    const baseline = computeBaseline([target], makeExtractionContext());
    expect(normalise(baseline, target, 6.5)).toBeCloseTo(1.3, 10);
  });

  it("returns null for a zero baseline", () => {
    const naked = makeExtractionContext({ modifiers: makeSkillModifiers({ xpRewards: [] }) });
    const baseline = computeBaseline([target], naked);
    expect(normalise(baseline, target, 5)).toBeNull();
  });

  it("returns null for a target missing from the baseline", () => {
    expect(normalise(new Map(), target, 5)).toBeNull();
  });
});

describe("targetKey", () => {
  it("ignores weight", () => {
    expect(targetKey(makeTarget("chests", "action", 1))).toBe(
      targetKey(makeTarget("chests", "action", 9)),
    );
  });
});

describe("shareOfBest", () => {
  it("is 0 at naked gear and 1 at the best value", () => {
    expect(shareOfBest(2, 6, 2)).toBe(0);
    expect(shareOfBest(2, 6, 6)).toBe(1);
    expect(shareOfBest(2, 6, 3)).toBeCloseTo(0.25, 10);
  });

  it("works for a negative baseline", () => {
    expect(shareOfBest(-10, 0, -5)).toBeCloseTo(0.5, 10);
  });

  it("is null when nothing improves the target", () => {
    expect(shareOfBest(2, 2, 2)).toBeNull();
  });
});
