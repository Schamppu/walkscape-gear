import { itemService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

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

export const fetchCollectibles = () => itemService.fetchCollectibles();

export async function getCategorizedItems(req, res) {
  try {
    const categorized = await itemService.getCategorizedItems();
    res.json(categorized);
  } catch (error) {
    console.error("Error fetching categorized items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
}

export async function getUrlMapping(req, res) {
  try {
    const urlMapping = await itemService.getUrlMapping();
    res.json(urlMapping);
  } catch (error) {
    console.error("Error fetching URL mapping:", error);
    res.status(500).json({ error: "Failed to fetch URL mapping" });
  }
}
