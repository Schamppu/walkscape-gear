import BaseService from "./baseService.js";
import { categorizeItems } from "../utils/categorizeItems.js";
import { createUrlMapping } from "../utils/createUrlMapping.js";
import { fetchAchievementRewards } from "../controllers/achievementController.js";
import { fetchItemRewards } from "../controllers/rewardsController.js";
import {
  fetchActivityItems,
  fetchChestItems,
} from "../controllers/lootTableController.js";
import { fetchSoldShopItems } from "../controllers/shopController.js";
import {
  fetchCraftingRecipes,
  fetchTrinketryRecipes,
} from "../controllers/recipeController.js";
import { fetchAllPets } from "../controllers/petController.js";
import { activityService, recipeService, locationService } from "./index.js";

class ItemService extends BaseService {
  constructor() {
    super("items");
  }

  async fetchCollectibles() {
    return this.search({ type: "collectible", detailed: true });
  }
  async fetchCrafted() {
    return this.search({ type: "crafted", detailed: true });
  }
  async fetchLoot() {
    return this.search({ type: "loot", detailed: true });
  }
  async fetchContainers() {
    return this.search({ type: "container", detailed: true });
  }
  async fetchConsumables() {
    return this.search({ type: "consumable", detailed: true });
  }

  async getCategorizedItems() {
    const [
      collectibles,
      crafted,
      loot,
      containers,
      consumables,
      itemRewards,
      achievementRewardItems,
      activityItems,
      chestItems,
      shopItems,
      craftingRecipes,
      trinketryRecipes,
      pets,
    ] = await Promise.all([
      this.fetchCollectibles(),
      this.fetchCrafted(),
      this.fetchLoot(),
      this.fetchContainers(),
      this.fetchConsumables(),
      fetchItemRewards(),
      fetchAchievementRewards(),
      fetchActivityItems(),
      fetchChestItems(),
      fetchSoldShopItems(),
      fetchCraftingRecipes(),
      fetchTrinketryRecipes(),
      fetchAllPets(),
    ]);

    return categorizeItems({
      collectibles,
      crafted,
      loot,
      containers,
      consumables,
      itemRewards,
      achievementRewardItems,
      activityItems,
      chestItems,
      shopItems,
      craftingRecipes,
      trinketryRecipes,
      pets,
    });
  }

  async getUrlMapping() {
    const [crafted, loot, consumables, activities, recipes, locations] =
      await Promise.all([
        this.fetchCrafted(),
        this.fetchLoot(),
        this.fetchConsumables(),
        activityService.list(),
        recipeService.list(),
        locationService.list(),
      ]);
    return createUrlMapping(
      [...crafted, ...loot],
      consumables,
      activities,
      recipes,
      locations
    );
  }

  async getFineMaterials() {
    const [materials, consumables] = await Promise.all([
      this.search({ canBeFine: "true", type: "material" }),
      this.search({ canBeFine: "true", type: "consumable" }),
    ]);

    return [
      ...materials.map(({ id }) => id),
      ...consumables.map(({ id }) => id),
    ];
  }
}

export default ItemService;
