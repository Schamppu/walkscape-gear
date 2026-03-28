import type { Requirement, LootTableRef } from "./common";

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export type RecipeSummary = {
  id: string;
  name: string;
  relatedSkills: string[];
  requirements: Requirement[];
  icon: string;
};

export type RecipeMaterialOption = {
  item: string;
  amount: number;
};

export type RecipeMaterial = {
  options: RecipeMaterialOption[];
};

export type RecipeDetail = RecipeSummary & {
  keywords: string[];
  workRequired: number;
  maxWorkEfficiency: number;
  materials: RecipeMaterial[];
  itemRewards: Record<string, number>;
  tables: LootTableRef[];
  xpRewards: Record<string, number>;
};
