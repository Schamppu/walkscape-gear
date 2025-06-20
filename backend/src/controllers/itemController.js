import { itemService } from "../services/index.js";
import { wrapController } from "./wrapController.js";
import { categorizeItems } from "../utils/categorizeItems.js";
import { fetchAchievementRewards } from "./achievementController.js";
import { fetchItemRewards } from "./rewardsController.js";
import { fetchActivityItems, fetchChestItems } from "./lootTableController.js";
import { fetchSoldShopItems } from "./shopController.js";

export const listItems = wrapController(() => itemService.list());

export const getItem = wrapController(
  (req) => {
    const { id } = req.params;
    return itemService.getById(id);
  },
  {
    notFoundMessage: "Item not found",
  }
);

export const fetchCollectibles = () =>
  itemService.search({ type: "collectible", detailed: true });
const fetchCrafted = () =>
  itemService.search({ type: "crafted", detailed: true });
const fetchLoot = () => itemService.search({ type: "loot", detailed: true });
const fetchContainers = () => itemService.search({ type: "container", detailed: true });

export async function getCategorizedItems(req, res) {
  try {
    const [
      collectibles,
      crafted,
      loot,
      containers,
      itemRewards,
      achievementRewardItems,
      activityItems,
      chestItems,
      shopItems,
    ] = await Promise.all([
      fetchCollectibles(),
      fetchCrafted(),
      fetchLoot(),
      fetchContainers(),
      fetchItemRewards(),
      fetchAchievementRewards(),
      fetchActivityItems(),
      fetchChestItems(),
      fetchSoldShopItems(),
    ]);

    const categorized = categorizeItems({
      collectibles,
      crafted,
      loot,
      containers,
      itemRewards,
      achievementRewardItems,
      activityItems,
      chestItems,
      shopItems,
    });

    res.json(categorized);
  } catch (error) {
    console.error("Error fetching categorized items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
}
