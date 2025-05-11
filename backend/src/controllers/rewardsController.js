import { rewardsService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const getRewards = wrapController(() => rewardsService.list());
