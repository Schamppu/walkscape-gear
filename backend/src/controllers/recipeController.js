import { recipeService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const listRecipes = wrapController(() => recipeService.list());

export const getRecipe = wrapController(
  (req) => {
    const { id } = req.params;
    return recipeService.getById(id);
  },
  {
    notFoundMessage: "Recipe not found",
  }
);

export const fetchCraftingRecipes = () => recipeService.fetchCraftingRecipes();

export const fetchTrinketryRecipes = () =>
  recipeService.fetchTrinketryRecipes();

export const fetchSmithingRecipes = () => recipeService.fetchSmithingRecipes();

export const fetchTailoringRecipes = () =>
  recipeService.fetchTailoringRecipes();
