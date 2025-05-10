import { Router } from "express";
import {
  listItems,
  getItem,
  getCollectibles,
  getCrafted,
  getLoot,
} from "../controllers/itemController.js";

const router = Router();

router.get("/", listItems);
router.get("/collectibles", getCollectibles);
router.get("/crafted", getCrafted);
router.get("/loot", getLoot);
router.get("/id/:id", getItem);

export { router as itemRoutes };
