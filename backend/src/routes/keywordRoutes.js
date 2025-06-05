import { Router } from "express";
import { listKeywords, getKeyword } from "../controllers/keywordsController.js";

const router = Router();

router.get("/", listKeywords);
router.get("/:id", getKeyword);

export { router as keywordRoutes };
