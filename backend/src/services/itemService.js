import BaseService from "./baseService.js";
import { categorizeItems } from "../utils/categorizeItems.js";
import { createUrlMapping } from "../utils/createUrlMapping.js";
import { fetchAchievementRewards } from "../controllers/achievementController.js";
import { fetchItemRewards } from "../controllers/rewardsController.js";
import {
  fetchActivityItems,
  fetchChestItems,
  fetchChestTables,
} from "../controllers/lootTableController.js";
import { fetchSoldShopItems } from "../controllers/shopController.js";
import {
  fetchCraftingRecipes,
  fetchTrinketryRecipes,
  fetchSmithingRecipes,
  fetchTailoringRecipes,
} from "../controllers/recipeController.js";
import { fetchAllPets } from "../controllers/petController.js";
import {
  activityService,
  recipeService,
  locationService,
  petService,
} from "./index.js";
import { createItemValueMap } from "../utils/ItemValueMap.js";

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
  async fetchMaterials() {
    return this.search({ type: "material", detailed: true });
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
      fetchAllPets(),
    ]);

    const [
      craftingRecipes,
      trinketryRecipes,
      smithingRecipes,
      tailoringRecipes,
    ] = await Promise.all([
      fetchCraftingRecipes(),
      fetchTrinketryRecipes(),
      fetchSmithingRecipes(),
      fetchTailoringRecipes(),
    ]);

    const allRecipes = [
      ...craftingRecipes,
      ...trinketryRecipes,
      ...smithingRecipes,
      ...tailoringRecipes,
    ];

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
      allRecipes,
      pets,
    });
  }

  async getUrlMapping() {
    const [crafted, loot, consumables, activities, recipes, locations, pets] =
      await Promise.all([
        this.fetchCrafted(),
        this.fetchLoot(),
        this.fetchConsumables(),
        activityService.list(),
        recipeService.list(),
        locationService.list(),
        petService.list(),
      ]);
    return createUrlMapping(
      [...crafted, ...loot],
      consumables,
      activities,
      recipes,
      locations,
      pets,
    );
  }

  async getItemValueMapping() {
    const [crafted, loot, consumables, materials, containers, chestTables] =
      await Promise.all([
        this.fetchCrafted(),
        this.fetchLoot(),
        this.fetchConsumables(),
        this.fetchMaterials(),
        this.fetchContainers(),
        fetchChestTables(),
      ]);

    return createItemValueMap(
      crafted,
      loot,
      consumables,
      materials,
      containers,
      chestTables,
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
