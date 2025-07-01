import { createBaseRouter } from "./baseRouter.js";

import { Router } from "express";
import { achievementRoutes } from "./achievementRoutes.js";
import { dbRoutes } from "./dbRoutes.js";
import { itemRoutes } from "./itemRoutes.js";
import iconRoutes from "./iconRoutes.js";
import lootTableRoutes from "./lootTableRoutes.js";
import {
  activityService,
  keywordService,
  locationService,
  recipeService,
  serviceService,
  skillService,
  statService,
} from "../services/index.js";

export function registerRoutes(app) {
  const apiRouter = Router();

  apiRouter.use("/achievements", achievementRoutes);
  apiRouter.use("/activities", createBaseRouter("Activity", activityService));
  apiRouter.use("/icons", iconRoutes);
  apiRouter.use("/items", itemRoutes);
  apiRouter.use("/keywords", createBaseRouter("Keyword", keywordService));
  apiRouter.use("/locations", createBaseRouter("Location", locationService));
  apiRouter.use("/lootTables", lootTableRoutes);
  apiRouter.use("/recipes", createBaseRouter("Recipe", recipeService))
  apiRouter.use("/services", createBaseRouter("Service", serviceService))
  apiRouter.use("/skills", createBaseRouter("Skill", skillService));
  apiRouter.use("/stats", createBaseRouter("Stat", statService));

  const dbRouter = Router();
  dbRouter.use("/", dbRoutes);

  app.use("/api", apiRouter);
  app.use("/db", dbRouter);
}
