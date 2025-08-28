import { intersect } from "./intersect";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { usePlayerStore } from "@/store/player";

export function useRequirements() {
  const activity = useActivityStore();
  const gear = useGearStore();
  const player = usePlayerStore();

  const checkRequirements = (reqs) => {
    if (!reqs || !reqs.length) return true;

    const data = {
      activity: activity.activitySelected && activity.activity,
      recipe: activity.recipeSelected && activity.recipe,
      location: activity.location,
      achievementPoints: player.achievementPoints,
      gear: gear.equippedGear,
      factionReputation: player.factionReputation,
    };

    return reqs.every((requirements) => checkRequirement(requirements, data));
  };

  const checkRequirement = (req, data) => {
    const { type, opposite, requirement } = req;
    const {
      activity,
      recipe,
      location,
      achievementPoints,
      gear,
      factionReputation,
    } = data;
    const equippedKeywordCounts = gear
      ? gear
          .flatMap(({ keywords }) => keywords)
          .reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {})
      : {};

    let value = false;
    switch (type) {
      case "mainSkill":
        if (activity)
          value = activity.relatedSkillsList[0] === requirement.skill;
        if (recipe) value = recipe.relatedSkills[0] === requirement.skill;
        break;
      case "locationHasKeywords":
        if (location)
          value =
            intersect(location.keywords, requirement.keywords).length ===
            requirement.keywords.length;
        break;
      case "achievementPoint":
        value = achievementPoints > requirement.value;
        break;
      case "distinctKeywordItemsEquipped":
        value = requirement.keywords.every(
          (kw) => equippedKeywordCounts[kw] >= requirement.quantity
        );
        break;
      case "historyData":
        value = true;
        break;
      case "realm":
        // TODO: add location check for travelling
        if (activity) value = activity.id === "travelling";
        if (location)
          value =
            location.faction === requirement.realm ||
            location.subFactions?.includes(requirement.realm);
        break;
      case "traveling":
        if (activity) value = activity.id === "travelling";
        break;
      case "gameData":
        if (factionReputation) {
          const { data, gameDataId } = requirement;
          const rep = JSON.parse(data).double || 0;
          value = factionReputation[gameDataId] >= rep;
        }
        break;
      case "skillLevel":
        value = player.skillLevels[requirement.skill] >= requirement.level;
        break;
      case "activityType":
        if (activity) value = activity.id === requirement.activity;
        break;
      case "totalSkillLevelUps":
        value =
          Object.values(player.skillLevels).reduce((a, b) => a + b - 1, 0) >=
          requirement.levels;
        break;
      default:
        console.error("unhandled requirement", type, requirement);
    }

    return opposite ? !value : value;
  };

  return {
    checkRequirements,
  };
}
