import {
  xpToSkillLevel,
  skillLevelFromXp,
  xpProgressInSkillLevel,
  xpToNextSkillLevel,
  XP_TABLE,
} from "@/domain/character/skillLevel";

describe("Skill Level Calculations", () => {
  test("xpToSkillLevel calculates correct XP for given level", () => {
    expect(xpToSkillLevel(1)).toBe(0);
    expect(xpToSkillLevel(20)).toBe(4_470);
    expect(xpToSkillLevel(50)).toBe(101_333);
    expect(xpToSkillLevel(80)).toBe(1_986_068);
    expect(xpToSkillLevel(99)).toBe(13_034_431);
  });

  test("skillLevelFromXp returns correct level for given XP", () => {
    expect(skillLevelFromXp(0)).toBe(1);
    expect(skillLevelFromXp(5_000)).toBe(20);
    expect(skillLevelFromXp(100_000)).toBe(49);
    expect(skillLevelFromXp(1_000_000)).toBe(73);
    expect(skillLevelFromXp(15_000_000)).toBe(99);
  });

  test("xpProgressInSkillLevel calculates correct progress within current level", () => {
    // At level 1 with 0 XP, progress should be 0
    expect(xpProgressInSkillLevel(0)).toBe(0);

    // Halfway to level 2
    expect(xpProgressInSkillLevel(41.5)).toBeCloseTo(0.5, 2);

    // Halfway to level 20
    expect(xpProgressInSkillLevel(4_744)).toBeCloseTo(0.5, 2);

    // Halfway to level 50
    expect(xpProgressInSkillLevel(106_639)).toBeCloseTo(0.5, 2);

    // Max level
    expect(xpProgressInSkillLevel(14_000_000)).toBe(1);
  });

  test("xpToNextSkillLevel calculates correct XP needed for next level", () => {
    // XP needed to reach level 2
    expect(xpToNextSkillLevel(0)).toBe(83);

    // XP needed to reach level 2 with some XP already gained
    expect(xpToNextSkillLevel(50)).toBe(33);

    // XP to reach level 74 from 1M XP
    expect(xpToNextSkillLevel(1_000_000)).toBe(96_278);

    // XP to reach level 90 from 5M XP
    expect(xpToNextSkillLevel(5_000_000)).toBe(346_332);

    // Beyond max level should return 0
    expect(xpToNextSkillLevel(14_000_000)).toBe(0);
  });

  test("XP_TABLE is correctly pre-calculated", () => {
    expect(XP_TABLE[1]).toBe(0);
    expect(XP_TABLE[20]).toBe(4_470);
    expect(XP_TABLE[50]).toBe(101_333);
    expect(XP_TABLE[80]).toBe(1_986_068);
    expect(XP_TABLE[99]).toBe(13_034_431);
  });
});
