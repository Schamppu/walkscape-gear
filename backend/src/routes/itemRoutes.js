import { Router } from "express";
import {
  listItems,
  getItem,
  getCategorizedItems,
} from "../controllers/itemController.js";

const router = Router();

router.get("/", listItems);
router.get("/id/:id", getItem);
router.get("/categorized_items", getCategorizedItems);

export { router as itemRoutes };
