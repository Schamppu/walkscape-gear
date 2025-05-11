import { Router } from "express";
import { getShops } from "../controllers/shopController.js";

const router = Router();

router.get("/", getShops);

export { router as shopRoutes };
