import { createBaseRouter } from "./baseRouter.js";
import { lootTableService } from "../services/index.js";
import { fetchMultipleLootTables } from "../controllers/lootTableController.js";
import { wrapController } from "../controllers/wrapController.js";

const additionalRoutes = [
  {
    method: "post",
    path: "/multiple",
    handler: wrapController(async (req) => {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        throw new Error("ids must be an array");
      }
      return fetchMultipleLootTables(ids);
    }),
  },
];

const router = createBaseRouter(
  "lootTable",
  lootTableService,
  additionalRoutes
);

export default router;
