import express from "express";
import { getIcon, batch } from "../controllers/iconController.js";

const router = express.Router();

router.get("/:iconPath(*)", getIcon);
router.post("/batch", batch);

export default router;