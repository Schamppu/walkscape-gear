/**
 * Discriminated union types for every known requirement variant.
 *
 * The `type` field is the discriminant; `requirement` carries only the fields
 * relevant to that variant so callers get full type safety without casts.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

// ---------------------------------------------------------------------------
// Shared base
// ---------------------------------------------------------------------------

type RequirementBase = {
  name: string | null;
  opposite: boolean;
};

// ---------------------------------------------------------------------------
// Individual requirement variants
// ---------------------------------------------------------------------------

export type MainSkillRequirement = RequirementBase & {
  type: "mainSkill";
  requirement: { skill: string };
};

export type MainSkillTypeRequirement = RequirementBase & {
  type: "mainSkillType";
  requirement: { type: string };
};

export type LocationHasKeywordsRequirement = RequirementBase & {
  type: "locationHasKeywords";
  requirement: { keywords: string[] };
};

export type AchievementPointRequirement = RequirementBase & {
  type: "achievementPoint";
  requirement: { isPercentage: boolean; value: number };
};

export type DistinctKeywordItemsEquippedRequirement = RequirementBase & {
  type: "distinctKeywordItemsEquipped";
  requirement: { quantity: number; keywords: string[] };
};

export type HistoryDataRequirement = RequirementBase & {
  type: "historyData";
  requirement: {
    category: string;
    data: string;
    value: number;
    distinct: boolean;
  };
};

export type RealmRequirement = RequirementBase & {
  type: "realm";
  requirement: { realm: string };
};

export type TravelingRequirement = RequirementBase & {
  type: "traveling";
  requirement: Record<string, never>;
};

export type ServiceRequirement = RequirementBase & {
  type: "service";
  requirement: { keywords?: string[]; serviceKeyword?: string; tier: string };
};

export type GameDataRequirement = RequirementBase & {
  type: "gameData";
  requirement: { gameDataId: string; data: string };
};

export type SkillLevelRequirement = RequirementBase & {
  type: "skillLevel";
  requirement: { skill: string; level: number };
};

export type ActivityTypeRequirement = RequirementBase & {
  type: "activityType";
  requirement: { keywords: string[]; skill: string | null; activity: string | null };
};

export type TotalSkillLevelRequirement = RequirementBase & {
  type: "totalSkillLevel";
  requirement: { levels: number };
};

export type TotalSkillLevelUpsRequirement = RequirementBase & {
  type: "totalSkillLevelUps";
  requirement: { levels: number };
};

export type ItemAnywhereRequirement = RequirementBase & {
  type: "itemAnywhere";
  requirement: { item: string };
};

export type ItemAnywhereWithYouRequirement = RequirementBase & {
  type: "itemAnywhereWithYou";
  requirement: { item: string };
};

export type KeywordEquippedRequirement = RequirementBase & {
  type: "keywordEquipped";
  requirement: { keyword: string };
};

export type KeywordWithLevelEquippedRequirement = RequirementBase & {
  type: "keywordWithLevelEquipped";
  requirement: { keyword: string; skill: string; level: number };
};

export type ItemEquippedRequirement = RequirementBase & {
  type: "itemEquipped";
  requirement: { item: string };
};

export type AbilityAvailableRequirement = RequirementBase & {
  type: "abilityAvailable";
  requirement: { ability: string; scanEquippedItems: boolean };
};

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type Requirement =
  | MainSkillRequirement
  | MainSkillTypeRequirement
  | LocationHasKeywordsRequirement
  | AchievementPointRequirement
  | DistinctKeywordItemsEquippedRequirement
  | HistoryDataRequirement
  | RealmRequirement
  | TravelingRequirement
  | ServiceRequirement
  | GameDataRequirement
  | SkillLevelRequirement
  | ActivityTypeRequirement
  | TotalSkillLevelRequirement
  | TotalSkillLevelUpsRequirement
  | ItemAnywhereRequirement
  | ItemAnywhereWithYouRequirement
  | KeywordEquippedRequirement
  | KeywordWithLevelEquippedRequirement
  | ItemEquippedRequirement
  | AbilityAvailableRequirement;
