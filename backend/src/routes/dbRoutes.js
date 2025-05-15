import { Router } from "express";
import { getUserInfo, upsertUserInfo } from "../controllers/dbController.cjs";

const router = Router();

router.get("/user_stats", getUserInfo);
router.post("/user_stats", upsertUserInfo);

export { router as dbRoutes };
