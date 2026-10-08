/**
 * Discriminated union types for every known requirement variant.
 *
 * The `type` field is the discriminant; `requirement` carries only the fields
 * relevant to that variant so callers get full type safety without casts.
 *
 * Aliases of the generated OpenAPI types (`./generated/api`, regenerate with
 * `npm run gen:api-types`).
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { components } from "./generated/api";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// Individual requirement variants
// ---------------------------------------------------------------------------

export type MainSkillRequirement = Schemas["MainSkillRequirement"];
export type MainSkillTypeRequirement = Schemas["MainSkillTypeRequirement"];
export type LocationHasKeywordsRequirement = Schemas["LocationHasKeywordsRequirement"];
export type AchievementPointRequirement = Schemas["AchievementPointRequirement"];
export type DistinctKeywordItemsEquippedRequirement = Schemas["DistinctKeywordItemsEquippedRequirement"];
export type DistinctKeywordItemInInventoryRequirement = Schemas["DistinctKeywordItemInInventoryRequirement"];
export type HistoryDataRequirement = Schemas["HistoryDataRequirement"];
export type RealmRequirement = Schemas["RealmRequirement"];
export type TravelingRequirement = Schemas["TravelingRequirement"];
export type ServiceRequirement = Schemas["ServiceRequirement"];
export type GameDataRequirement = Schemas["GameDataRequirement"];
export type CharacterLevelRequirement = Schemas["CharacterLevelRequirement"];
export type SkillLevelRequirement = Schemas["SkillLevelRequirement"];
export type SkillTypeLevelRequirement = Schemas["SkillTypeLevelRequirement"];
export type ActivityTypeRequirement = Schemas["ActivityTypeRequirement"];
export type TotalSkillLevelRequirement = Schemas["TotalSkillLevelRequirement"];
export type TotalSkillLevelUpsRequirement = Schemas["TotalSkillLevelUpsRequirement"];
export type InputKeywordWithLevelRequirement = Schemas["InputKeywordWithLevelRequirement"];
export type ItemAnywhereRequirement = Schemas["ItemAnywhereRequirement"];
export type ItemAnywhereWithYouRequirement = Schemas["ItemAnywhereWithYouRequirement"];
export type KeywordEquippedRequirement = Schemas["KeywordEquippedRequirement"];
export type KeywordWithLevelEquippedRequirement = Schemas["KeywordWithLevelEquippedRequirement"];
export type ItemEquippedRequirement = Schemas["ItemEquippedRequirement"];
export type AbilityAvailableRequirement = Schemas["AbilityAvailableRequirement"];
export type HaveCoinsRequirement = Schemas["HaveCoinsRequirement"];
export type CollectiblesOwnedRequirement = Schemas["CollectiblesOwnedRequirement"];
export type ExploreRealmRequirement = Schemas["ExploreRealmRequirement"];
export type TotalWealthRequirement = Schemas["TotalWealthRequirement"];

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type Requirement = Schemas["Requirement"];
