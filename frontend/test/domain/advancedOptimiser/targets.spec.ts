import { describe, it, expect } from "vitest";
import {
  validXValues,
  validYValues,
  isTargetValid,
  availableXValues,
  availableYValues,
  nextUnusedTarget,
  sourceTableFlags,
  recipeProducesCraftedItem,
} from "@/domain/advancedOptimiser/targets";
import type { Target } from "@/domain/advancedOptimiser/config";
import type { LootTableRef } from "@/domain/types/common";
import { makeTarget, makeTargetContext } from "../../fixtures/advancedOptimiser";

const table = (type: string[]): LootTableRef => ({
  isPrimary: false,
  type,
  rollAmount: 1,
  tables: [],
});

// ---------------------------------------------------------------------------
// validXValues / validYValues
// ---------------------------------------------------------------------------

describe("validXValues", () => {
  it("offers only the always-valid Xs for a plain activity", () => {
    expect(validXValues(makeTargetContext())).toEqual(["xp", "rewardRolls"]);
  });

  it.each([
    ["fineMaterials", { hasFineMaterials: true }],
    ["chests", { hasChests: true }],
    ["collectibles", { hasCollectibles: true }],
    ["tokens", { hasTokens: true }],
    ["coins", { hasCoins: true }],
  ] as const)("offers %s when the context has it", (x, overrides) => {
    expect(validXValues(makeTargetContext(overrides))).toContain(x);
  });

  it("offers eternalCrafts only for recipes that produce a crafted item", () => {
    expect(validXValues(makeTargetContext({ isRecipe: true }))).not.toContain("eternalCrafts");
    expect(validXValues(makeTargetContext({ producesCraftedItem: true }))).not.toContain(
      "eternalCrafts",
    );
    expect(
      validXValues(makeTargetContext({ isRecipe: true, producesCraftedItem: true })),
    ).toContain("eternalCrafts");
  });
});

describe("validYValues", () => {
  it("offers step and action for activities", () => {
    expect(validYValues(makeTargetContext())).toEqual(["step", "action"]);
  });

  it("adds material for recipes", () => {
    expect(validYValues(makeTargetContext({ isRecipe: true }))).toEqual([
      "step",
      "action",
      "material",
    ]);
  });
});

describe("isTargetValid", () => {
  it("accepts xp / step anywhere", () => {
    expect(isTargetValid(makeTarget("xp", "step"), makeTargetContext())).toBe(true);
  });

  it("rejects an invalid X", () => {
    expect(isTargetValid(makeTarget("chests", "step"), makeTargetContext())).toBe(false);
  });

  it("rejects an invalid Y", () => {
    expect(isTargetValid(makeTarget("xp", "material"), makeTargetContext())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// availableXValues / availableYValues
// ---------------------------------------------------------------------------

describe("availableYValues", () => {
  it("excludes Ys already paired with the same X", () => {
    const others = [makeTarget("xp", "step")];
    expect(availableYValues("xp", others, makeTargetContext())).toEqual(["action"]);
    expect(availableYValues("tokens", others, makeTargetContext())).toEqual(["step", "action"]);
  });
});

describe("availableXValues", () => {
  it("excludes an X once all its Ys are used", () => {
    const others = [makeTarget("xp", "step"), makeTarget("xp", "action")];
    expect(availableXValues(others, makeTargetContext())).toEqual(["rewardRolls"]);
  });
});

// ---------------------------------------------------------------------------
// nextUnusedTarget
// ---------------------------------------------------------------------------

describe("nextUnusedTarget", () => {
  it("returns the first valid pair with weight 0", () => {
    expect(nextUnusedTarget([], makeTargetContext())).toEqual(makeTarget("xp", "step", 0));
  });

  it("moves on to the next unused X with step", () => {
    expect(nextUnusedTarget([makeTarget("xp", "step")], makeTargetContext())).toEqual(
      makeTarget("rewardRolls", "step", 0),
    );
  });

  it("uses step even when the X's row in use has a different Y", () => {
    expect(nextUnusedTarget([makeTarget("xp", "action")], makeTargetContext())).toEqual(
      makeTarget("rewardRolls", "step", 0),
    );
  });

  it("falls back to free step pairs before action once every X is used", () => {
    const ctx = makeTargetContext();
    const targets = [
      makeTarget("xp", "action"),
      makeTarget("rewardRolls", "step"),
      makeTarget("tokens", "step"),
    ];
    expect(nextUnusedTarget(targets, ctx)).toEqual(makeTarget("xp", "step", 0));
  });

  it("falls back to action once every X has a step row", () => {
    const ctx = makeTargetContext();
    const targets = validXValues(ctx).map((x) => makeTarget(x, "step"));
    expect(nextUnusedTarget(targets, ctx)).toEqual(makeTarget("xp", "action", 0));
  });

  it("returns null when every valid pair is used", () => {
    const ctx = makeTargetContext();
    const all: Target[] = validXValues(ctx).flatMap((x) =>
      validYValues(ctx).map((y) => makeTarget(x, y)),
    );
    expect(nextUnusedTarget(all, ctx)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sourceTableFlags
// ---------------------------------------------------------------------------

describe("sourceTableFlags", () => {
  it.each([null, undefined, []])("returns no flags for %s", (tables) => {
    expect(sourceTableFlags(tables)).toEqual({ hasChests: false, hasCollectibles: false });
  });

  it("detects chest and collectible tables", () => {
    expect(sourceTableFlags([table(["chestTable"]), table(["collectible"])])).toEqual({
      hasChests: true,
      hasCollectibles: true,
    });
  });

  it("ignores other table types", () => {
    expect(sourceTableFlags([table(["gem"])])).toEqual({
      hasChests: false,
      hasCollectibles: false,
    });
  });
});

// ---------------------------------------------------------------------------
// recipeProducesCraftedItem
// ---------------------------------------------------------------------------

describe("recipeProducesCraftedItem", () => {
  const types: Record<string, string> = { sword: "crafted", plank: "material" };
  const typeOf = (id: string): string | undefined => types[id];

  it("is true when the main reward is crafted", () => {
    expect(recipeProducesCraftedItem({ itemRewards: { sword: 1 } }, typeOf)).toBe(true);
  });

  it("is false when the main reward is not crafted", () => {
    expect(recipeProducesCraftedItem({ itemRewards: { plank: 1 } }, typeOf)).toBe(false);
  });

  it("is false for unknown items and empty rewards", () => {
    expect(recipeProducesCraftedItem({ itemRewards: { unknown: 1 } }, typeOf)).toBe(false);
    expect(recipeProducesCraftedItem({ itemRewards: {} }, typeOf)).toBe(false);
  });
});
