import BaseService from "./baseService.js";

class RecipeService extends BaseService {
  constructor() {
    super("recipes");
  }

  async fetchCraftingRecipes() {
    return this.search({ relatedSkills: "crafting", detailed: true });
  }

  async fetchTrinketryRecipes() {
    return this.search({ relatedSkills: "trinketry", detailed: true });
  }

  async fetchSmithingRecipes() {
    return this.search({ relatedSkills: "smithing", detailed: true });
  }

  async fetchTailoringRecipes() {
    return this.search({ relatedSkills: "tailoring", detailed: true });
  }
}

export default RecipeService;
