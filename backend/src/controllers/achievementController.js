import { achievementService } from "../services/index.js";

export const fetchAchievementRewards = () =>
  achievementService
    .list()
    .then((arr) => arr.flatMap(({ itemRewards }) => itemRewards));
