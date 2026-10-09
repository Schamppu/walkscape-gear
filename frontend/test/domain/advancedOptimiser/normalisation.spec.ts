import { describe, it, expect } from "vitest";
import { computeBaseline, normalise, targetKey } from "@/domain/advancedOptimiser/normalisation";
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
