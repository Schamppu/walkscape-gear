import type { Requirement, LootTableRef } from "./common";

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export type ActivitySummary = {
  id: string;
  name: string;
  relatedSkillsList: string[];
  icon: string;
};

export type ActivityRequiredKeyword = {
  id: string;
  keyword: string;
};

export type ActivityInputBase = {
  type: string;
};

export type KeywordInputActivity = ActivityInputBase & {
  type: "keyword";
  keyword: string;
  requirements?: Requirement[];
}

export type SpecificInputActivity = ActivityInputBase & {
  type: "specific";
  item: string;
  quantity: number;
  quality: string | null;
  isOptional: boolean;
}

export type ActivityInput = KeywordInputActivity | SpecificInputActivity;

export type ActivityInputOption = {
  type: "inputActivity";
  inputs: ActivityInput[];
  enableAttributes: boolean;
  enableTierBenefit: boolean;
  enableQualityBenefit: boolean;
  enableFineBenefit: boolean;
  requireFine: boolean;
};

export type ActivityLimitedOption = {
  type: "limitedActivity";
  maxCompletions: number;
};

export type ActivityOption = ActivityInputOption | ActivityLimitedOption;

export type ActivityReward = {
  runtimeType: string;
  [key: string]: unknown;
};

export type ActivityDetail = ActivitySummary & {
  keywords: string[];
  requiredKeywords?: ActivityRequiredKeyword[] | null;
  xpRewardsMap: Record<string, number>;
  workRequired: number;
  maxWorkEfficiency: number;
  requirements: Requirement[];
  tables: LootTableRef[];
  rewards: ActivityReward[];
  options?: ActivityOption[] | null;
  abilities?: string[];
};
