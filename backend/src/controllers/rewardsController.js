import { rewardsService } from "../services/index.js";

export const fetchItemRewards = () => rewardsService.list()
