import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isHighStat,
  startScore,
  compareScore,
  LOW_STATS,
  HIGH_STATS,
} from "@/domain/optimiser/scoring";
import { makeOptimiserItem } from "../../fixtures/optimiser";

// ---------------------------------------------------------------------------
// isHighStat
// ---------------------------------------------------------------------------

describe("isHighStat", () => {
  it("returns false for every LOW_STAT priority", () => {
    for (const prio of LOW_STATS) {
      expect(isHighStat(prio)).toBe(false);
    }
  });

  it("returns true for every HIGH_STAT priority", () => {
    for (const prio of HIGH_STATS) {
      expect(isHighStat(prio)).toBe(true);
    }
  });

  it("returns false for an unknown priority", () => {
    expect(isHighStat("unknownPriority")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// startScore
// ---------------------------------------------------------------------------

describe("startScore", () => {
  it("returns Infinity for every LOW_STAT priority (lower is better)", () => {
    for (const prio of LOW_STATS) {
      expect(startScore(prio)).toBe(Infinity);
    }
  });

  it("returns -Infinity for every HIGH_STAT priority (higher is better)", () => {
    for (const prio of HIGH_STATS) {
      expect(startScore(prio)).toBe(-Infinity);
    }
  });

  it("returns Infinity for an unknown priority (safe default)", () => {
    expect(startScore("unknownPriority")).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// compareScore
// ---------------------------------------------------------------------------

describe("compareScore", () => {
  describe("LOW_STAT priorities (lower score = better)", () => {
    const prio = "stepsPerRewardRoll";

    it("returns positive when value is lower (better) than best", () => {
      expect(compareScore(50, 100, prio)).toBeGreaterThan(0);
    });

    it("returns negative when value is higher (worse) than best", () => {
      expect(compareScore(100, 50, prio)).toBeLessThan(0);
    });

    it("returns 0 when value equals best", () => {
      expect(compareScore(75, 75, prio)).toBe(0);
    });
  });

  describe("HIGH_STAT priorities (higher score = better)", () => {
    const prio = "xpPerStep";

    it("returns positive when value is higher (better) than best", () => {
      expect(compareScore(100, 50, prio)).toBeGreaterThan(0);
    });

    it("returns negative when value is lower (worse) than best", () => {
      expect(compareScore(50, 100, prio)).toBeLessThan(0);
    });

    it("returns 0 when value equals best", () => {
      expect(compareScore(75, 75, prio)).toBe(0);
    });
  });

  describe("unknown priority (falls back to LOW_STAT behaviour)", () => {
    it("returns positive when value is lower than best", () => {
      expect(compareScore(50, 100, "unknownPriority")).toBeGreaterThan(0);
    });
  });

  it("compareScore is consistent across all LOW_STATS", () => {
    for (const prio of LOW_STATS) {
      expect(compareScore(50, 100, prio)).toBeGreaterThan(0);
      expect(compareScore(100, 50, prio)).toBeLessThan(0);
    }
  });

  it("compareScore is consistent across all HIGH_STATS", () => {
    for (const prio of HIGH_STATS) {
      expect(compareScore(100, 50, prio)).toBeGreaterThan(0);
      expect(compareScore(50, 100, prio)).toBeLessThan(0);
    }
  });
});
