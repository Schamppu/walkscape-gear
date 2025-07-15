import { Router } from "express";
import {
  listItems,
  getItem,
  getCategorizedItems,
  getUrlMapping,
} from "../controllers/itemController.js";

const router = Router();

router.get("/", listItems);
router.get("/categorized_items", getCategorizedItems);
router.get("/url_mapping", getUrlMapping);
router.get("/:id", getItem);


export { router as itemRoutes };
