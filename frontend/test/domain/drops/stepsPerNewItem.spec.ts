import { describe, it, expect } from "vitest";
import {
  computeNewItems,
  computeStepsPerAnyNewItem,
  type NewItemEntry,
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

const allItems: Record<string, { type: string }> = {
  rusty_sword: { type: "loot" },
  collectible_badge: { type: "collectible" },
  rare_gem: { type: "gem" },
  bird_nest: { type: "material" },
  blue_dragon_egg: { type: "material" }, // pet egg – identified by table type
  wood_log: { type: "material" },
};

// ---------------------------------------------------------------------------
// computeNewItems
// ---------------------------------------------------------------------------

describe("computeNewItems", () => {
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
    const dropMap = {
      blue_dragon_egg: makeInfo("blue_dragon_egg", 50000, ["petEgg"]),
    };
    const result = computeNewItems(dropMap, [], {}, allItems);
    expect(result.map((i) => i.id)).toContain("blue_dragon_egg");
  });

  it("excludes items whose type is not loot, collectible, or petEgg", () => {
    const dropMap = {
      rare_gem: makeInfo("rare_gem", 500, ["gem"]),
      bird_nest: makeInfo("bird_nest", 500, ["birdNest"]),
      wood_log: makeInfo("wood_log", 500),
    };
    const result = computeNewItems(dropMap, [], {}, allItems);
    expect(result).toHaveLength(0);
  });

  it("excludes items already in ownedItems", () => {
    const dropMap = { rusty_sword: makeInfo("rusty_sword", 500) };
    const result = computeNewItems(dropMap, [], { rusty_sword: {} }, allItems);
    expect(result).toHaveLength(0);
  });

  it("excludes pet egg when the pet (without _egg) is owned", () => {
    const dropMap = {
      blue_dragon_egg: makeInfo("blue_dragon_egg", 50000, ["petEgg"]),
    };
    const result = computeNewItems(dropMap, [], { blue_dragon: {} }, allItems);
    expect(result).toHaveLength(0);
  });

  it("includes pet egg when the pet (without _egg) is not owned", () => {
    const dropMap = {
      blue_dragon_egg: makeInfo("blue_dragon_egg", 50000, ["petEgg"]),
    };
    const result = computeNewItems(dropMap, [], {}, allItems);
    expect(result).toHaveLength(1);
  });

  it("includes loot items from chestInfos when provided", () => {
    const chestDropMap = {
      rare_loot: makeInfo("rare_loot", 30000),
    };
    const chestAllItems = { ...allItems, rare_loot: { type: "loot" } };
    const result = computeNewItems({}, [{ dropInfoMap: chestDropMap }], {}, chestAllItems);
    expect(result.map((i) => i.id)).toContain("rare_loot");
  });

  it("deduplicates items that appear in both dropMap and chestInfos", () => {
    const dropMap = { rusty_sword: makeInfo("rusty_sword", 500) };
    const chestDropMap = { rusty_sword: makeInfo("rusty_sword", 1000) };
    const result = computeNewItems(dropMap, [{ dropInfoMap: chestDropMap }], {}, allItems);
    const ids = result.map((i) => i.id);
    expect(ids.filter((id) => id === "rusty_sword")).toHaveLength(1);
  });

  it("uses the first-seen stepsPerItem when deduplicating", () => {
    const dropMap = { rusty_sword: makeInfo("rusty_sword", 500) };
    const chestDropMap = { rusty_sword: makeInfo("rusty_sword", 1000) };
    const result = computeNewItems(dropMap, [{ dropInfoMap: chestDropMap }], {}, allItems);
    expect(result[0].stepsPerItem).toBe(500);
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
    const combined = computeStepsPerAnyNewItem(items);
    expect(combined).toBeLessThan(1000);
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
