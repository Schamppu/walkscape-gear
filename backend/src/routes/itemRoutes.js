import { createBaseRouter } from "./baseRouter.js";
import { itemService } from "../services/index.js";
import {
  getItem,
  getCategorizedItems,
  getUrlMapping,
} from "../controllers/itemController.js";

const router = createBaseRouter("items", itemService);

router.get("/categorized_items", getCategorizedItems);
router.get("/url_mapping", getUrlMapping);
router.get("/:id", getItem);

export default router;
