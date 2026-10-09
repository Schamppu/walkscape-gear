import type { components } from "./generated/api";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export type RecipeSummary = Schemas["RecipeListItem"];

export type RecipeMaterialOption = Schemas["RecipeMaterialOptions"][number];

export type RecipeDetail = Schemas["RecipeDetail"];

export type RecipeMaterial = RecipeDetail["materials"][number];
