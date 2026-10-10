import { describe, it, expect } from "vitest";
import { abilityStepsPerActivation } from "@/domain/abilities/abilityLootTables";

describe("abilityStepsPerActivation", () => {
  it("uses the steps of a steps-based cooldown", () => {
    expect(
      abilityStepsPerActivation({ id: "cd", steps: 1234, charges: 20 }, 50),
    ).toBe(1234);
  });

  it("multiplies actions by steps per action for an actions-based cooldown", () => {
    expect(abilityStepsPerActivation({ id: "cd", actions: 10 }, 50)).toBe(500);
  });

  it("returns null for time-based or missing cooldowns", () => {
    expect(abilityStepsPerActivation({ id: "cd", hours: 1 }, 50)).toBeNull();
    expect(abilityStepsPerActivation(null, 50)).toBeNull();
  });
});
