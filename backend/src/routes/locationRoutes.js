import { createBaseRouter } from "./baseRouter.js";
import { locationService } from "../services/index.js";
import { getRealmDefaultLocations } from "../controllers/locationController.js";

const additionalRoutes = [
  {
    method: "get",
    path: "/realm_default_locations",
    handler: getRealmDefaultLocations,
  },
];

const router = createBaseRouter("locations", locationService, additionalRoutes);

export default router;
