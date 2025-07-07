import { createBaseRouter } from "./baseRouter.js";
import { lootTableService } from "../services/index.js";
import { fetchMultipleLootTables } from "../controllers/lootTableController.js";
import { wrapController } from "../controllers/wrapController.js";

const router = createBaseRouter("lootTable", lootTableService);

router.post(
  "/multiple",
  wrapController(async (req) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      throw new Error("ids must be an array");
    }
    return fetchMultipleLootTables(ids);
  })
);

export default router;
