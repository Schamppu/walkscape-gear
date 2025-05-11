import { Router } from "express";
import {
  getActivityItems,
  getChestItems,
} from "../controllers/lootTableController.js";

const router = Router();

router.get("/chest_items", getChestItems);
router.get("/activity_items", getActivityItems);

export { router as lootTableRoutes };
