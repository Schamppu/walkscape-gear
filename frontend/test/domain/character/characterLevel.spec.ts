import {
  getToolbeltSize,
  characterLevelFromSteps,
  stepsToCharacterLevel,
  STEPS_TABLE,
} from "@/domain/character/characterLevel";

describe("Character Level Calculations", () => {
  test("getToolbeltSize returns correct size for given level", () => {
    expect(getToolbeltSize(1)).toBe(3);
    expect(getToolbeltSize(10)).toBe(3);
    expect(getToolbeltSize(20)).toBe(4);
    expect(getToolbeltSize(40)).toBe(4);
    expect(getToolbeltSize(50)).toBe(5);
    expect(getToolbeltSize(70)).toBe(5);
    expect(getToolbeltSize(80)).toBe(6);
    expect(getToolbeltSize(99)).toBe(6);
  });

  test("stepsToCharacterLevel calculates correct steps for given level", () => {
    expect(stepsToCharacterLevel(1)).toBe(0);
    expect(Math.round(stepsToCharacterLevel(10))).toBe(5_308);
    expect(Math.round(stepsToCharacterLevel(30))).toBe(61_470);
    expect(Math.round(stepsToCharacterLevel(50))).toBe(466_132);
    expect(Math.round(stepsToCharacterLevel(70))).toBe(3_393_084);
    expect(Math.round(stepsToCharacterLevel(99))).toBe(59_958_383);
  });

  test("STEPS_TABLE is correctly pre-calculated for levels 1-99", () => {
    expect(Math.round(STEPS_TABLE[1])).toBe(0);
    expect(Math.round(STEPS_TABLE[10])).toBe(5_308);
    expect(Math.round(STEPS_TABLE[30])).toBe(61_470);
    expect(Math.round(STEPS_TABLE[50])).toBe(466_132);
    expect(Math.round(STEPS_TABLE[70])).toBe(3_393_084);
    expect(Math.round(STEPS_TABLE[99])).toBe(59_958_383);
  });

  test("characterLevelFromSteps returns correct level for given steps", () => {
    expect(characterLevelFromSteps(0)).toBe(1);
    expect(characterLevelFromSteps(1_000)).toBe(3);
    expect(characterLevelFromSteps(10_000)).toBe(14);
    expect(characterLevelFromSteps(100_000)).toBe(34);
    expect(characterLevelFromSteps(1_000_000)).toBe(57);
    expect(characterLevelFromSteps(15_000_000)).toBe(85);
  });
});
