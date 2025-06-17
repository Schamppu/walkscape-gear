import { createBaseRouter } from "./baseRouter.js";

import { Router } from "express";
import { dbRoutes } from "./dbRoutes.js";
import { itemRoutes } from "./itemRoutes.js";
import iconRoutes from "./iconRoutes.js";
import {
  activityService,
  keywordService,
  locationService,
  skillService,
  statService,
} from "../services/index.js";

export function registerRoutes(app) {
  const apiRouter = Router();

  apiRouter.use("/activities", createBaseRouter("Activity", activityService));
  apiRouter.use("/icons", iconRoutes);
  apiRouter.use("/items", itemRoutes);
  apiRouter.use("/keywords", createBaseRouter("Keyword", keywordService));
  apiRouter.use("/locations", createBaseRouter("Location", locationService));
  apiRouter.use("/skills", createBaseRouter("Skill", skillService));
  apiRouter.use("/stats", createBaseRouter("Stat", statService));

  const dbRouter = Router();
  dbRouter.use("/", dbRoutes);

  app.use("/api", apiRouter);
  app.use("/db", dbRouter);
}
