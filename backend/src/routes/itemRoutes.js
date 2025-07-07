import { Router } from "express";
import {
  listItems,
  getItem,
  getCategorizedItems,
  getUrlMapping,
} from "../controllers/itemController.js";

const router = Router();

router.get("/", listItems);
router.get("/id/:id", getItem);
router.get("/categorized_items", getCategorizedItems);
router.get("/url_mapping", getUrlMapping);


export { router as itemRoutes };
