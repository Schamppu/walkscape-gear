import type { components } from "./generated/api";
import type { LootTableRef } from "./common";

type Schemas = components["schemas"];

export type LootTableSummary = Schemas["LootTableListItem"];

/**
 * The spec declares `relatedSkill` as `SkillsEnum & null`, which collapses to
 * `never`; the API returns a skill id here.
 */
export type RequirementBonus = Omit<Schemas["RequirementBonus"], "relatedSkill"> & {
  relatedSkill: Schemas["SkillsEnum"];
};

type WithRequirementBonus<T> = Omit<T, "requirementsBonuses"> & {
  requirementsBonuses: RequirementBonus[] | null;
};

type ApiLootTableDetail = Schemas["LootTableDetail"];

// ---------------------------------------------------------------------------
// Loot table row detail
// ---------------------------------------------------------------------------

export type LootTableRow = WithRequirementBonus<
  NonNullable<ApiLootTableDetail["tableRows"]>[number]
>;

/**
 * An inline sub-table within a chest loot table.
 * `weight` is the per-roll probability that this sub-table is triggered.
 */
export type ChestSubTable = Omit<
  NonNullable<ApiLootTableDetail["subTables"]>[number],
  "tableRows"
> & {
  tableRows: LootTableRow[] | null;
};

export type LootTableDetail = Omit<ApiLootTableDetail, "tableRows" | "subTables"> & {
  tableRows: LootTableRow[] | null;
  subTables: ChestSubTable[] | null;
};

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
