import { Router } from "express";
import { listItems, getItem } from "../controllers/itemController.js";

const router = Router();

router.get("/", listItems);
router.get("/id/:id", getItem);

export { router as itemRoutes };
