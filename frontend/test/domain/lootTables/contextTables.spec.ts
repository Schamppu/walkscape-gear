import { describe, it, expect } from "vitest";
import {
  resolveSourceContextTables,
  filterDetailedTables,
  deduplicateAndGroupDrops,
  mergeTableGroups,
} from "@/domain/lootTables/contextTables";
import {
  makeDetailedContextTable,
  makeLootTableRow,
} from "../../fixtures/lootTables";
import type { LootTableRef } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLootTableRef(overrides: Partial<LootTableRef> = {}): LootTableRef {
  return {
    isPrimary: true,
    type: ["normal"],
    rollAmount: 1,
    tables: ["table_01"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveSourceContextTables
// ---------------------------------------------------------------------------

describe("resolveSourceContextTables", () => {
  it("returns [] for a null source", () => {
    expect(resolveSourceContextTables(null)).toEqual([]);
  });

  it("returns [] when source has no tables", () => {
    expect(resolveSourceContextTables({ name: "fishing" })).toEqual([]);
  });

  it("returns [] when tables array is empty", () => {
    expect(resolveSourceContextTables({ name: "fishing", tables: [] })).toEqual(
      [],
    );
  });

  it("maps each table ref to a ContextLootTable with the activity-prefixed tableSource", () => {
    const ref = makeLootTableRef();
    const result = resolveSourceContextTables({
      name: "fishing",
      tables: [ref],
    });
    expect(result).toHaveLength(1);
    expect(result[0].tableSource).toBe("activity-fishing");
  });

  it("Adds rollchance attribute not present in the original table", () => {
    const result = resolveSourceContextTables({
      name: "fishing",
      tables: [makeLootTableRef()],
    });
    expect(result[0].rollChance).toBe(1);
  });

  it("produces one entry per table ref", () => {
    const result = resolveSourceContextTables({
      name: "fishing",
      tables: [makeLootTableRef(), makeLootTableRef({ tables: ["table_02"] })],
    });
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// filterDetailedTables
// ---------------------------------------------------------------------------

describe("filterDetailedTables", () => {
  it("returns all tables unchanged when hideOwnedCollectibles is false", () => {
    const tables = [
      makeDetailedContextTable({ type: ["collectible"] }),
      makeDetailedContextTable({ type: ["normal"] }),
    ];
    const result = filterDetailedTables(tables, false, ["item_01"]);
    expect(result).toHaveLength(2);
  });

  it("filters out a collectible table whose item is in ownedCollectibleIds", () => {
    const table = makeDetailedContextTable({
      type: ["collectible"],
      tables: [
        {
          noDropChance: 0,
          tableRows: [makeLootTableRow({ rowItemID: "coll_01" })],
        },
      ],
    });
    const result = filterDetailedTables([table], true, ["coll_01"]);
    expect(result).toHaveLength(0);
  });

  it("keeps a collectible table whose item is NOT in ownedCollectibleIds", () => {
    const table = makeDetailedContextTable({
      type: ["collectible"],
      tables: [
        {
          noDropChance: 0,
          tableRows: [makeLootTableRow({ rowItemID: "coll_02" })],
        },
      ],
    });
    const result = filterDetailedTables([table], true, ["coll_01"]);
    expect(result).toHaveLength(1);
  });

  it("keeps a non-collectible table that has rows when hiding owned collectibles", () => {
    const table = makeDetailedContextTable({
      type: ["normal"],
      tables: [{ noDropChance: 0, tableRows: [makeLootTableRow()] }],
    });
    const result = filterDetailedTables([table], true, []);
    expect(result).toHaveLength(1);
  });

  it("filters out a non-collectible table with no rows when hiding owned collectibles", () => {
    const table = makeDetailedContextTable({
      type: ["normal"],
      tables: [{ noDropChance: 0, tableRows: [] }],
    });
    const result = filterDetailedTables([table], true, []);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// deduplicateAndGroupDrops
// ---------------------------------------------------------------------------

describe("deduplicateAndGroupDrops", () => {
  it("returns an empty array for empty input", () => {
    expect(deduplicateAndGroupDrops([])).toEqual([]);
  });

  it("groups rows with the same rowItemID from different sources into one group", () => {
    const tableA = makeDetailedContextTable({
      tableSource: "activity-fishing",
      tables: [
        {
          noDropChance: 0,
          tableRows: [makeLootTableRow({ rowItemID: "fish_01" })],
        },
      ],
    });
    const tableB = makeDetailedContextTable({
      tableSource: "gear-rod",
      tables: [
        {
          noDropChance: 0,
          tableRows: [makeLootTableRow({ rowItemID: "fish_01" })],
        },
      ],
    });
    const groups = deduplicateAndGroupDrops([tableA, tableB]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("removes exact duplicates (same item × same source × same slot)", () => {
    const table = makeDetailedContextTable({
      tableSource: "activity-fishing",
      slot: "tool",
      tables: [
        {
          noDropChance: 0,
          tableRows: [
            makeLootTableRow({ rowItemID: "fish_01" }),
            makeLootTableRow({ rowItemID: "fish_01" }),
          ],
        },
      ],
    });
    const groups = deduplicateAndGroupDrops([table]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(1);
  });

  it("groups isMoney rows under the 'gold' key", () => {
    const table = makeDetailedContextTable({
      tables: [
        {
          noDropChance: 0,
          tableRows: [makeLootTableRow({ rowItemID: null, isMoney: true })],
        },
      ],
    });
    const groups = deduplicateAndGroupDrops([table]);
    expect(groups).toHaveLength(1);
    expect(groups[0][0].isMoney).toBe(true);
  });

  it("skips rows with no rowItemID that are not money", () => {
    const table = makeDetailedContextTable({
      tables: [
        {
          noDropChance: 0,
          tableRows: [makeLootTableRow({ rowItemID: null, isMoney: false })],
        },
      ],
    });
    const groups = deduplicateAndGroupDrops([table]);
    expect(groups).toHaveLength(0);
  });

  it("produces separate groups for different item IDs", () => {
    const table = makeDetailedContextTable({
      tables: [
        {
          noDropChance: 0,
          tableRows: [
            makeLootTableRow({ rowItemID: "item_a" }),
            makeLootTableRow({ rowItemID: "item_b" }),
          ],
        },
      ],
    });
    const groups = deduplicateAndGroupDrops([table]);
    expect(groups).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// mergeTableGroups
// ---------------------------------------------------------------------------

describe("mergeTableGroups", () => {
  it("returns an empty array for empty input", () => {
    expect(mergeTableGroups([])).toEqual([]);
  });

  it("keeps tables with different type/rollAmount/tableSource separate", () => {
    const tableA = makeDetailedContextTable({ tableSource: "source-a" });
    const tableB = makeDetailedContextTable({ tableSource: "source-b" });
    expect(mergeTableGroups([tableA, tableB])).toHaveLength(2);
  });

  it("merges stat-sourced tables by accumulating rollChance", () => {
    const tableA = makeDetailedContextTable({ stat: "bonus", rollChance: 0.4 });
    const tableB = makeDetailedContextTable({ stat: "bonus", rollChance: 0.3 });
    const result = mergeTableGroups([tableA, tableB]);
    expect(result).toHaveLength(1);
    expect(result[0].rollChance).toBeCloseTo(0.7);
  });

  it("caps accumulated rollChance at 1.0 for stat-sourced tables", () => {
    const tableA = makeDetailedContextTable({ stat: "bonus", rollChance: 0.7 });
    const tableB = makeDetailedContextTable({ stat: "bonus", rollChance: 0.7 });
    const result = mergeTableGroups([tableA, tableB]);
    expect(result[0].rollChance).toBe(1);
  });

  it("concatenates sub-tables for non-stat (activity) tables with the same key", () => {
    const subTableA = {
      noDropChance: 0,
      tableRows: [makeLootTableRow({ rowItemID: "item_a" })],
    };
    const subTableB = {
      noDropChance: 0,
      tableRows: [makeLootTableRow({ rowItemID: "item_b" })],
    };
    const tableA = makeDetailedContextTable({ tables: [subTableA] });
    const tableB = makeDetailedContextTable({ tables: [subTableB] });
    const result = mergeTableGroups([tableA, tableB]);
    expect(result).toHaveLength(1);
    expect(result[0].tables).toHaveLength(2);
  });
});
