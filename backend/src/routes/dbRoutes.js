import { Router } from "express";
import {
  getUserInfo,
  upsertUserInfo,
  getUserOwnedItems,
  upsertUserOwnedItems,
  getUserFactionReputations,
  upsertUserFactionReputations,
  getGearSetTags,
  getGearSets,
  getGearSet,
  upsertGearSet,
  deleteGearSet,
  getUserSettings,
  upsertUserSettings,
} from "../controllers/dbController.js";

const router = Router();

router.get("/user_stats", getUserInfo);
router.post("/user_stats", upsertUserInfo);
router.get("/owned_items", getUserOwnedItems);
router.post("/owned_items", upsertUserOwnedItems);
router.get("/faction_reputations", getUserFactionReputations);
router.post("/faction_reputations", upsertUserFactionReputations);
router.get("/gear_set_tags", getGearSetTags);
router.get("/gear_sets", getGearSets);
router.get("/gear_sets/:id", getGearSet);
router.post("/gear_sets", upsertGearSet);
router.delete("/gear_sets/:id", deleteGearSet);
router.get("/user_settings", getUserSettings);
router.post("/user_settings", upsertUserSettings);

export { router as dbRoutes };
