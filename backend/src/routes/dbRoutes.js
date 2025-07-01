import { Router } from "express";
import {
  getUserInfo,
  upsertUserInfo,
  getUserOwnedItems,
  upsertUserOwnedItems,
  getUserFactionReputations,
  upsertUserFactionReputations,
} from "../controllers/dbController.cjs";

const router = Router();

router.get("/user_stats", getUserInfo);
router.post("/user_stats", upsertUserInfo);
router.get("/owned_items", getUserOwnedItems);
router.post("/owned_items", upsertUserOwnedItems);
router.get("/faction_reputations", getUserFactionReputations);
router.post("/faction_reputations", upsertUserFactionReputations);

export { router as dbRoutes };
