import { Router } from "express";
import { listStats, getStat } from "../controllers/statController.js";

const router = Router();

router.get("/", listStats);
router.get("/:id", getStat);

export { router as statRoutes };
