import { Router } from "express";
import { getRewards } from "../controllers/rewardsController.js";

const router = Router();

router.get("/", getRewards);

export { router as rewardRoutes };
