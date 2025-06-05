import { Router } from "express";
import { achievementRoutes } from "./achievementRoutes.js";
import { activityRoutes } from "./activityRoutes.js";
import { dbRoutes } from "./dbRoutes.js";
import { itemRoutes } from "./itemRoutes.js";
import { lootTableRoutes } from "./lootTableRoutes.js";
import { rewardRoutes } from "./rewardsRoutes.js";
import { shopRoutes } from "./shopRoutes.js";
import { skillRoutes } from "./skillRoutes.js";
import { statRoutes } from "./statRoutes.js";
import iconRoutes from "./iconRoutes.js";

export function registerRoutes(app) {
  const apiRouter = Router();

  apiRouter.use("/achievements", achievementRoutes);
  apiRouter.use("/activities", activityRoutes);
  apiRouter.use("/icons", iconRoutes);
  apiRouter.use("/items", itemRoutes);
  apiRouter.use("/loot_tables", lootTableRoutes);
  apiRouter.use("/rewards", rewardRoutes);
  apiRouter.use("/shops", shopRoutes);
  apiRouter.use("/skills", skillRoutes);
  apiRouter.use("/stats", statRoutes);

  const dbRouter = Router();
  dbRouter.use("/", dbRoutes);

  app.use("/api", apiRouter);
  app.use("/db", dbRouter);
}
