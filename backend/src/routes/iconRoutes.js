import express from "express";
import { getIcon } from "../controllers/iconController.js";

const router = express.Router();

router.get("/:iconPath(*)", getIcon);

export default router;