/**
 * Cross-cutting types shared across multiple domain categories.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { components } from "./generated/api";

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export type { Requirement } from "@/domain/types/requirement";

// ---------------------------------------------------------------------------
// Loot table references (used by activities, recipes, etc.)
// ---------------------------------------------------------------------------

export type LootTableRef = components["schemas"]["LootTable"];
