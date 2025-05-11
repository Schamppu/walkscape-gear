import { shopService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const getShops = wrapController(() => shopService.list());
