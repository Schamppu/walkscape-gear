import { Router } from "express";
import { listSkills, getSkill } from "../controllers/skillController.js";

const router = Router();

router.get("/", listSkills);
router.get("/:id", getSkill);

export { router as skillRoutes };
