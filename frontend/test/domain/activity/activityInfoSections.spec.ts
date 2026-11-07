import { describe, it, expect } from "vitest";
import {
  roundToQuarterPercent,
  computeStepsPerRep,
  classifyRequirements,
} from "@/domain/activity/activityInfoSections";
import type { Requirement } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// roundToQuarterPercent
// ---------------------------------------------------------------------------

describe("roundToQuarterPercent", () => {
  it("returns 0 for 0", () => {
    expect(roundToQuarterPercent(0)).toBe(0);
  });

  it("returns 100 for 1 (100% WE)", () => {
    expect(roundToQuarterPercent(1)).toBe(100);
  });

  it("rounds up to nearest 0.25 boundary", () => {
    // 0.501 * 400 = 200.4 → ceil = 201 → /4 = 50.25
    expect(roundToQuarterPercent(0.501)).toBe(50.25);
  });

  it("does not round when already on a 0.25 boundary", () => {
    // 0.25 * 400 = 100 → ceil = 100 → /4 = 25
    expect(roundToQuarterPercent(0.25)).toBe(25);
  });

  it("handles values below 0.25 boundary", () => {
    // 0.001 * 400 = 0.4 → ceil = 1 → /4 = 0.25
    expect(roundToQuarterPercent(0.001)).toBe(0.25);
  });
});

// ---------------------------------------------------------------------------
// computeStepsPerRep
// ---------------------------------------------------------------------------

describe("computeStepsPerRep", () => {
  it("returns stepsPerAction when rewardAmount is 1", () => {
    expect(computeStepsPerRep(1, 500)).toBe(500);
  });

  it("doubles steps when rewardAmount is 0.5", () => {
    expect(computeStepsPerRep(0.5, 500)).toBe(1000);
  });

  it("halves steps when rewardAmount is 2", () => {
    expect(computeStepsPerRep(2, 500)).toBe(250);
  });

  it("scales proportionally", () => {
    expect(computeStepsPerRep(5, 1000)).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// classifyRequirements
// ---------------------------------------------------------------------------

const skillReq = (skill: string, level: number): Requirement =>
  ({ type: "skillLevel", skill, level }) as unknown as Requirement;

const otherReq = (type: string): Requirement =>
  ({ type }) as unknown as Requirement;

describe("classifyRequirements", () => {
  it("returns empty groups for null input", () => {
    expect(classifyRequirements(null)).toEqual({ skillLevel: [], other: [] });
  });

  it("returns empty groups for undefined input", () => {
    expect(classifyRequirements(undefined)).toEqual({
      skillLevel: [],
      other: [],
    });
  });

  it("returns empty groups for an empty array", () => {
    expect(classifyRequirements([])).toEqual({ skillLevel: [], other: [] });
  });

  it("separates skillLevel from other requirements", () => {
    const reqs = [
      skillReq("mining", 10),
      otherReq("questCompleted"),
      skillReq("crafting", 5),
    ];
    const { skillLevel, other } = classifyRequirements(reqs);
    expect(skillLevel).toHaveLength(2);
    expect(other).toHaveLength(1);
  });

  it("puts all skill-level reqs into skillLevel", () => {
    const reqs = [skillReq("agility", 20), skillReq("woodcutting", 15)];
    const { skillLevel, other } = classifyRequirements(reqs);
    expect(skillLevel).toHaveLength(2);
    expect(other).toHaveLength(0);
  });

  it("puts all non-skill-level reqs into other", () => {
    const reqs = [otherReq("questCompleted"), otherReq("achievementUnlocked")];
    const { skillLevel, other } = classifyRequirements(reqs);
    expect(skillLevel).toHaveLength(0);
    expect(other).toHaveLength(2);
  });

  it("does not mutate the input array", () => {
    const reqs = [skillReq("mining", 1), otherReq("questCompleted")];
    const copy = [...reqs];
    classifyRequirements(reqs);
    expect(reqs).toEqual(copy);
  });
});
