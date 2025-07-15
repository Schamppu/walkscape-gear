import { createBaseRouter } from "./baseRouter.js";
import { itemService } from "../services/index.js";
import {
  getCategorizedItems,
  getUrlMapping,
} from "../controllers/itemController.js";

const additionalRoutes = [
  { method: "get", path: "/categorized_items", handler: getCategorizedItems },
  { method: "get", path: "/url_mapping", handler: getUrlMapping },
];

const router = createBaseRouter("items", itemService, additionalRoutes);

export default router;
