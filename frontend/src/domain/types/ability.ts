/**
 * Ability types, aliased from the generated OpenAPI types
 * (`./generated/api`, regenerate with `npm run gen:api-types`).
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { components } from "./generated/api";

type Schemas = components["schemas"];

export type AbilitySummary = Schemas["AbilityListItem"];

/** Discriminated on `type` ("effect", "experience", "rollLootTable", ...). */
export type AbilityAction = Schemas["Action"];

/** Discriminated on `dataType` ("normal", "null"). */
export type AbilityData = Schemas["Data"];

export type AbilityCooldown = Schemas["Cooldown"];

export type AbilityDetail = Schemas["AbilityDetail"];
