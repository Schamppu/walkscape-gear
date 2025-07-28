import { createBaseRouter } from "./baseRouter.js";
import { itemService } from "../services/index.js";
import {
  getCategorizedItems,
  getUrlMapping,
  getFineMaterials,
} from "../controllers/itemController.js";

const additionalRoutes = [
  { method: "get", path: "/categorized_items", handler: getCategorizedItems },
  { method: "get", path: "/url_mapping", handler: getUrlMapping },
  { method: "get", path: "/fine_materials", handler: getFineMaterials },
];

const router = createBaseRouter("items", itemService, additionalRoutes);

export default router;
