/**
 * Cross-cutting types shared across multiple domain categories.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export type { Requirement } from "@/domain/types/requirement";

// ---------------------------------------------------------------------------
// Loot table references (used by activities, recipes, etc.)
// ---------------------------------------------------------------------------

export type LootTableRef = {
  isPrimary: boolean;
  type: string[];
  rollAmount: number;
  tables: string[];
};
