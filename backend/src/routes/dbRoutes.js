import { Router } from "express";
import {
  getUserBootstrap,
  getUserInfo,
  upsertUserInfo,
  getUserOwnedItems,
  upsertUserOwnedItems,
  getUserFactionReputations,
  upsertUserFactionReputations,
  getGearSetTags,
  getGearSets,
  exportGearSets,
  getGearSet,
  upsertGearSet,
  deleteGearSet,
  getUserSettings,
  upsertUserSettings,
  getOptimiserPresets,
  upsertOptimiserPreset,
  deleteOptimiserPreset,
  reorderOptimiserPresets,
  deleteUserData,
} from "../controllers/dbController.js";

const router = Router();

router.get("/bootstrap", getUserBootstrap);
router.get("/user_stats", getUserInfo);
router.post("/user_stats", upsertUserInfo);
router.get("/owned_items", getUserOwnedItems);
router.post("/owned_items", upsertUserOwnedItems);
router.get("/faction_reputations", getUserFactionReputations);
router.post("/faction_reputations", upsertUserFactionReputations);
router.get("/gear_set_tags", getGearSetTags);
router.get("/gear_sets", getGearSets);
router.get("/gear_sets/export", exportGearSets);
router.get("/gear_sets/:id", getGearSet);
router.post("/gear_sets", upsertGearSet);
router.delete("/gear_sets/:id", deleteGearSet);
router.get("/user_settings", getUserSettings);
router.post("/user_settings", upsertUserSettings);
router.get("/optimiser_presets", getOptimiserPresets);
router.post("/optimiser_presets", upsertOptimiserPreset);
router.post("/optimiser_presets/order", reorderOptimiserPresets);
router.delete("/optimiser_presets/:id", deleteOptimiserPreset);
router.delete("/user_data", deleteUserData);

export { router as dbRoutes };
