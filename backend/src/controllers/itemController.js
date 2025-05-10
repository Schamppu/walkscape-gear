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

export const getCollectibles = wrapController(() => {
  return itemService.search({ type: "collectible", detailed: true });
});

export const getCrafted = wrapController(() => {
  return itemService.search({ type: "crafted", detailed: true });
});

export const getLoot = wrapController(() => {
  return itemService.search({ type: "loot", detailed: true });
});
