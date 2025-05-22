import { Router } from "express";
import {
  getUserInfo,
  upsertUserInfo,
  getUserOwnedItems,
  upsertUserOwnedItems,
} from "../controllers/dbController.cjs";

const router = Router();

router.get("/user_stats", getUserInfo);
router.post("/user_stats", upsertUserInfo);
router.get("/owned_items", getUserOwnedItems);
router.post("/owned_items", upsertUserOwnedItems);

export { router as dbRoutes };
