import { Router } from "express";
import {
  getActivities,
  searchActivities,
} from "../controllers/activityController.js";

const router = Router();

router.get("/", getActivities);
router.get("/:id", getActivities);
router.get("/search", searchActivities)

export { router as activityRoutes };
