import { describe, it, expect } from "vitest";
import {
  USEFUL_STATS_BY_X,
  USEFUL_STATS_BY_Y,
  unionUsefulStats,
  usefulStatsFor,
} from "@/domain/advancedOptimiser/stats";
import { X_VALUES, Y_VALUES } from "@/domain/advancedOptimiser/config";
import { makeTarget } from "../../fixtures/advancedOptimiser";

describe("usefulStatsFor", () => {
  it.each(X_VALUES.flatMap((x) => Y_VALUES.map((y) => [x, y] as const)))(
    "%s / %s is the deduplicated union of its X and Y stats",
    (x, y) => {
      const stats = usefulStatsFor({ x, y });
      expect(new Set(stats)).toEqual(
        new Set([...USEFUL_STATS_BY_X[x], ...USEFUL_STATS_BY_Y[y]]),
      );
      expect(stats).toHaveLength(new Set(stats).size);
    },
  );

  it("per-action (per completion) targets care about double action", () => {
    expect(usefulStatsFor({ x: "rewardRolls", y: "action" })).toContain("double_action");
  });

  it("per-action targets don't care about step cost", () => {
    const stats = usefulStatsFor({ x: "rewardRolls", y: "action" });
    expect(stats).not.toContain("work_efficiency");
    expect(stats).not.toContain("steps_required");
  });
});

describe("unionUsefulStats", () => {
  it("combines targets without duplicates", () => {
    const stats = unionUsefulStats([
      makeTarget("fineMaterials", "step"),
      makeTarget("collectibles", "step"),
    ]);
    expect(stats.filter((s) => s === "double_rewards")).toHaveLength(1);
    expect(stats).toEqual(
      expect.arrayContaining(["fine_material_finding", "find_collectibles", "work_efficiency"]),
    );
  });

  it("ignores weight-0 targets", () => {
    const stats = unionUsefulStats([
      makeTarget("xp", "action", 5),
      makeTarget("chests", "step", 0),
    ]);
    expect(stats).toEqual(["bonus_experience", "double_action"]);
  });

  it("returns nothing for no targets", () => {
    expect(unionUsefulStats([])).toEqual([]);
  });
});
