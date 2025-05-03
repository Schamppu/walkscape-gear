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
