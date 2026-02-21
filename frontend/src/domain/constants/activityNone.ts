export type ActivityNone = {
  id: string;
  nameLocalizationKey: string;
  name: string;
  value: string;
  keywords: string[];
  relatedSkillsList: string[];
  requiredKeywords: string[] | null;
  xpRewardsMap: Record<string, number> | null;
  workRequired: number | null;
  maxWorkEfficiency: number;
  requirements: unknown | null;
  tables: unknown | null;
};

export const activityNone: ActivityNone = {
  id: "none",
  nameLocalizationKey: "None",
  name: "None",
  value: "None",
  keywords: [],
  relatedSkillsList: [],
  requiredKeywords: null,
  xpRewardsMap: null,
  workRequired: null,
  maxWorkEfficiency: 1,
  requirements: null,
  tables: null,
};

export default activityNone;
