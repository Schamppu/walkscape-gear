import BaseService from "./baseService.js";

class RecipeService extends BaseService {
  constructor() {
    super("recipes");
  }

  async fetchCraftingRecipes() {
    return this.search({ relatedSkills: "crafting", detailed: true });
  }
}

export default RecipeService;
