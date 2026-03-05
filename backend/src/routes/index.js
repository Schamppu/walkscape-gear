import { createBaseRouter } from "./baseRouter.js";

import { Router } from "express";
import { achievementRoutes } from "./achievementRoutes.js";
import { dbRoutes } from "./dbRoutes.js";
import itemRoutes from "./itemRoutes.js";
import iconRoutes from "./iconRoutes.js";
import locationRoutes from "./locationRoutes.js";
import {
  abilitiesService,
  activityService,
  factionService,
  globalVariableService,
  keywordService,
  lootTableService,
  petService,
  recipeService,
  routeService,
  serviceService,
  skillService,
  statService,
  terrainModifierService,
} from "../services/index.js";

export function registerRoutes(app) {
  const apiRouter = Router();

  apiRouter.use("/abilities", createBaseRouter("Abilities", abilitiesService));
  apiRouter.use("/achievements", achievementRoutes);
  apiRouter.use("/activities", createBaseRouter("Activity", activityService));
  apiRouter.use("/factions", createBaseRouter("Faction", factionService));
  apiRouter.use("/global_variables", createBaseRouter("Global Variable", globalVariableService));
  apiRouter.use("/icons", iconRoutes);
  apiRouter.use("/items", itemRoutes);
  apiRouter.use("/keywords", createBaseRouter("Keyword", keywordService));
  apiRouter.use("/locations", locationRoutes);
  apiRouter.use("/lootTables", createBaseRouter("lootTable", lootTableService));
  apiRouter.use("/pets", createBaseRouter("Pets", petService));
  apiRouter.use("/recipes", createBaseRouter("Recipe", recipeService));
  apiRouter.use("/routes", createBaseRouter("Route", routeService));
  apiRouter.use("/services", createBaseRouter("Service", serviceService));
  apiRouter.use("/skills", createBaseRouter("Skill", skillService));
  apiRouter.use("/stats", createBaseRouter("Stat", statService));
  apiRouter.use(
    "/terrain_modifiers",
    createBaseRouter("Terrain Modifiers", terrainModifierService),
  );

  const dbRouter = Router();
  dbRouter.use("/", dbRoutes);

  app.use("/api", apiRouter);
  app.use("/db", dbRouter);
}
