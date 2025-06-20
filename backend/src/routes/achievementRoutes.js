import { Router } from "express";
import { getAchievementPointsMax } from "../controllers/achievementController.js";

const router = Router();

router.get("/ap", getAchievementPointsMax);

export { router as achievementRoutes };
