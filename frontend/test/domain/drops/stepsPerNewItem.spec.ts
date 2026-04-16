import { describe, it, expect } from "vitest";
import {
  computeNewItems,
  computeStepsPerAnyNewItem,
  type NewItemEntry,
  type ChestDropMap,
} from "@/domain/drops/stepsPerNewItem";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { MappedTableRow } from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInfo(
  id: string,
  stepsPerItem: number,
  tableTypes: string[] = [],
  icon?: string,
): DropItemInfo {
  const source = {
    rowItemID: id,
    rowWeight: 100,
    minWeightScale: 1,
    rowMinimumAmount: 1,
    rowMaximumAmount: 1,
    noDropChance: 0,
    tableWeight: 100,
    rollAmount: 1,
    type: tableTypes,
    tableSource: "activity-test",
    rollChance: 1,
  } as MappedTableRow;

  return {
    id,
    icon,
    sources: [source],
    totalDropChance: 5,
    stepsPerItem,
    itemsPerStep: 1000 / stepsPerItem,
    stepsPerNormal: stepsPerItem,
    stepsPerFine: 0,
    stepsPerRare: 0,
    dropCounts: "1",
    variableRequirement: null,
  };
}

function makeChest(
  chestItemId: string,
  items: Record<string, DropItemInfo>,
  icon = "chest.png",
): ChestDropMap {
  return { chestItemId, icon, dropInfoMap: items };
}

const allItems: Record<string, { type: string }> = {
  rusty_sword: { type: "loot" },
  collectible_badge: { type: "collectible" },
  rare_gem: { type: "gem" },
  bird_nest: { type: "material" },
  blue_dragon_egg: { type: "material" }, // pet egg – identified by table type
  wood_log: { type: "material" },
  chest_loot_a: { type: "loot" },
  chest_loot_b: { type: "loot" },
};

// ---------------------------------------------------------------------------
// computeNewItems – activity drops
// ---------------------------------------------------------------------------

describe("computeNewItems - activity drops", () => {
  it("includes loot-type items not in ownedItems", () => {
    const dropMap = { rusty_sword: makeInfo("rusty_sword", 500) };
    const result = computeNewItems(dropMap, [], {}, allItems);
    expect(result.map((i) => i.id)).toContain("rusty_sword");
  });

  it("includes collectible-type items not in ownedItems", () => {
    const dropMap = { collectible_badge: makeInfo("collectible_badge", 1000) };
    const result = computeNewItems(dropMap, [], {}, allItems);
    expect(result.map((i) => i.id)).toContain("collectible_badge");
  });

  it("includes petEgg table-type items not in ownedItems", () => {
    const dropMap = { blue_dragon_egg: makeInfo("blue_dragon_egg", 50000, ["petEgg"]) };
    const result = computeNewItems(dropMap, [], {}, allItems);
    expect(result.map((i) => i.id)).toContain("blue_dragon_egg");
  });

  it("excludes items whose type is not loot, collectible, or petEgg", () => {
    const dropMap = {
      rare_gem: makeInfo("rare_gem", 500, ["gem"]),
      bird_nest: makeInfo("bird_nest", 500, ["birdNest"]),
      wood_log: makeInfo("wood_log", 500),
    };
    expect(computeNewItems(dropMap, [], {}, allItems)).toHaveLength(0);
  });

  it("excludes items already in ownedItems", () => {
    const dropMap = { rusty_sword: makeInfo("rusty_sword", 500) };
    expect(computeNewItems(dropMap, [], { rusty_sword: {} }, allItems)).toHaveLength(0);
  });

  it("excludes pet egg when the pet (without _egg) is owned", () => {
    const dropMap = { blue_dragon_egg: makeInfo("blue_dragon_egg", 50000, ["petEgg"]) };
    expect(computeNewItems(dropMap, [], { blue_dragon: {} }, allItems)).toHaveLength(0);
  });

  it("includes pet egg when the pet (without _egg) is not owned", () => {
    const dropMap = { blue_dragon_egg: makeInfo("blue_dragon_egg", 50000, ["petEgg"]) };
    expect(computeNewItems(dropMap, [], {}, allItems)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// computeNewItems – chest grouping
// ---------------------------------------------------------------------------

describe("computeNewItems - chest grouping", () => {
  it("returns one entry per chest that has at least one new item", () => {
    const chest = makeChest("wood_chest", {
      chest_loot_a: makeInfo("chest_loot_a", 10000),
      chest_loot_b: makeInfo("chest_loot_b", 20000),
    });
    const result = computeNewItems({}, [chest], {}, allItems);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("wood_chest");
  });

  it("uses the chest icon as the entry icon", () => {
    const chest = makeChest("wood_chest", {
      chest_loot_a: makeInfo("chest_loot_a", 10000),
    }, "chest_icon.png");
    const result = computeNewItems({}, [chest], {}, allItems);
    expect(result[0].icon).toBe("chest_icon.png");
  });

  it("stepsPerItem for the chest entry is the harmonic mean of its new items", () => {
    // Items: 10000 and 20000 → harmonic mean = 1/(1/10000 + 1/20000) ≈ 6667
    const chest = makeChest("wood_chest", {
      chest_loot_a: makeInfo("chest_loot_a", 10000),
      chest_loot_b: makeInfo("chest_loot_b", 20000),
    });
    const result = computeNewItems({}, [chest], {}, allItems);
    const expected = 1 / (1 / 10000 + 1 / 20000);
    expect(result[0].stepsPerItem).toBeCloseTo(expected, 1);
  });

  it("omits a chest when all its items are already owned", () => {
    const chest = makeChest("wood_chest", {
      chest_loot_a: makeInfo("chest_loot_a", 10000),
    });
    const result = computeNewItems({}, [chest], { chest_loot_a: {} }, allItems);
    expect(result).toHaveLength(0);
  });

  it("partially owned chest: only unowned items contribute to the step count", () => {
    // chest_loot_a is owned; only chest_loot_b (20000 steps) qualifies
    const chest = makeChest("wood_chest", {
      chest_loot_a: makeInfo("chest_loot_a", 10000),
      chest_loot_b: makeInfo("chest_loot_b", 20000),
    });
    const result = computeNewItems({}, [chest], { chest_loot_a: {} }, allItems);
    expect(result).toHaveLength(1);
    expect(result[0].stepsPerItem).toBeCloseTo(20000, 1);
  });

  it("returns separate entries for two chests that both have new items", () => {
    const chest1 = makeChest("chest_a", { chest_loot_a: makeInfo("chest_loot_a", 10000) });
    const chest2 = makeChest("chest_b", { chest_loot_b: makeInfo("chest_loot_b", 20000) });
    const result = computeNewItems({}, [chest1, chest2], {}, allItems);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain("chest_a");
    expect(result.map((r) => r.id)).toContain("chest_b");
  });

  it("omits chest items of non-qualifying type", () => {
    // wood_log is type 'material', not 'loot'
    const chest = makeChest("wood_chest", {
      wood_log: makeInfo("wood_log", 500),
    });
    expect(computeNewItems({}, [chest], {}, allItems)).toHaveLength(0);
  });

  it("chest and activity drop appear as separate entries (no dedup across them)", () => {
    const dropMap = { rusty_sword: makeInfo("rusty_sword", 500) };
    const chest = makeChest("wood_chest", {
      chest_loot_a: makeInfo("chest_loot_a", 10000),
    });
    const result = computeNewItems(dropMap, [chest], {}, allItems);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// computeStepsPerAnyNewItem
// ---------------------------------------------------------------------------

describe("computeStepsPerAnyNewItem", () => {
  it("returns 0 for an empty list", () => {
    expect(computeStepsPerAnyNewItem([])).toBe(0);
  });

  it("returns the item's own steps for a single item", () => {
    const items: NewItemEntry[] = [{ id: "a", icon: undefined, stepsPerItem: 20000 }];
    expect(computeStepsPerAnyNewItem(items)).toBeCloseTo(20000, 5);
  });

  it("computes harmonic combined steps for two items", () => {
    // 1/(1/20000 + 1/30000) = 12000
    const items: NewItemEntry[] = [
      { id: "a", icon: undefined, stepsPerItem: 20000 },
      { id: "b", icon: undefined, stepsPerItem: 30000 },
    ];
    expect(computeStepsPerAnyNewItem(items)).toBeCloseTo(12000, 1);
  });

  it("is less than the minimum individual steps with multiple items", () => {
    const items: NewItemEntry[] = [
      { id: "a", icon: undefined, stepsPerItem: 1000 },
      { id: "b", icon: undefined, stepsPerItem: 5000 },
      { id: "c", icon: undefined, stepsPerItem: 10000 },
    ];
    expect(computeStepsPerAnyNewItem(items)).toBeLessThan(1000);
  });

  it("is symmetric — order of items does not matter", () => {
    const items: NewItemEntry[] = [
      { id: "a", icon: undefined, stepsPerItem: 500 },
      { id: "b", icon: undefined, stepsPerItem: 1500 },
    ];
    const reversed = [...items].reverse();
    expect(computeStepsPerAnyNewItem(items)).toBeCloseTo(
      computeStepsPerAnyNewItem(reversed),
      8,
    );
  });
});
