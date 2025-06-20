import { achievementService } from "../services/index.js";
import { fetchCollectibles } from "./itemController.js";

export const fetchAchievementRewards = () =>
  achievementService
    .list()
    .then((arr) => arr.flatMap(({ itemRewards }) => itemRewards));

export async function getAchievementPointsMax(req, res) {
  const apMap = {
    easy: 1,
    normal: 3,
    hard: 5,
    extreme: 10,
  };

  const calculateAPByDifficulty = (achievements, apMap) => {
    const counts = achievements.reduce((acc, { difficulty }) => {
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});

    const result = {};
    for (const difficulty in counts) {
      result[difficulty] = counts[difficulty] * (apMap[difficulty] || 0);
    }
    return result;
  };

  try {
    const [collectibles, achievements] = await Promise.all([
      fetchCollectibles(),
      achievementService.list(),
    ]);

    const collectibleAP = collectibles.length;
    const apByDifficulty = calculateAPByDifficulty(achievements, apMap);
    const total =
      Object.values(apByDifficulty).reduce((sum, value) => sum + value, 0) +
      collectibleAP;

    return res.json({
      total,
      collectibles: collectibleAP,
      ...apByDifficulty,
    });
  } catch (error) {
    console.error("Error fetching categorized achievement points:", error);
    res.status(500).json({ error: "Failed to fetch achievement points" });
  }
}
