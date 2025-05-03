import { Router } from "express";
import { activityRoutes } from "./activityRoutes.js";
import { itemRoutes } from "./itemRoutes.js";
import { skillRoutes } from "./skillRoutes.js";
import iconRoutes from "./iconRoutes.js";

export function registerRoutes(app) {
  const router = Router();

  router.use("/activities", activityRoutes);
  router.use("/icons", iconRoutes);
  router.use("/items", itemRoutes);
  router.use("/skills", skillRoutes);

  app.use("/api", router);
}
