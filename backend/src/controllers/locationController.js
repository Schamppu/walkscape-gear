import { locationService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const getRealmDefaultLocations = wrapController(() =>
  locationService.getRealmDefaultLocations(),
);
