import { Router } from "express";
import {
  listActivities,
  getActivity,
} from "../controllers/activityController.js";

const router = Router();

router.get("/", listActivities);
router.get("/id/:id", getActivity);

export { router as activityRoutes };
