import type { components } from "./generated/api";
import type { LootTableRef } from "./common";

type Schemas = components["schemas"];

export type LootTableSummary = Schemas["LootTableListItem"];

export type RequirementBonus = Schemas["RequirementBonus"];

// ---------------------------------------------------------------------------
// Loot table row detail
// ---------------------------------------------------------------------------

export type LootTableDetail = Schemas["LootTableDetail"];

export type LootTableRow = NonNullable<LootTableDetail["tableRows"]>[number];

/**
 * An inline sub-table within a chest loot table.
 * `weight` is the per-roll probability that this sub-table is triggered.
 */
export type ChestSubTable = NonNullable<LootTableDetail["subTables"]>[number];

export type DetailedLootTable = {
  noDropChance: number;
  tableRows: LootTableRow[];
};

// ---------------------------------------------------------------------------
// Context loot tables (assembled from gear + activity sources)
// ---------------------------------------------------------------------------

/**
 * An entry produced by getCtxLootTables().
 * `tables` contains unresolved string IDs until detail is fetched.
 */
export type ContextLootTable = LootTableRef & {
  tableSource: string;
  slot?: string;
  stat?: string | null;
  rollChance: number;
};

/**
 * A ContextLootTable after IDs have been resolved to DetailedLootTable objects.
 */
export type DetailedContextLootTable = Omit<ContextLootTable, "tables"> & {
  tables: DetailedLootTable[];
};

// ---------------------------------------------------------------------------
// Flattened rows used for drop-chance calculations
// ---------------------------------------------------------------------------

/**
 * A single row flattened out of a DetailedContextLootTable,
 * enriched with context fields needed for probability math.
 */
export type MappedTableRow = LootTableRow & {
  noDropChance: number;
  tableWeight: number;
  rollAmount: number;
  slot?: string;
  stat?: string | null;
  type: string[];
  tableSource: string;
  rollChance: number;
};
