import { intersect } from "../utils/intersect";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useRouteStore } from "@/store/route";

export function useRequirements() {
  const activity = useActivityStore();
  const gear = useGearStore();
  const player = usePlayerStore();
  const items = useItemsStore();
  const route = useRouteStore();

  const getRequirementsContext = () => {
    return {
      activity: activity.activitySelected && activity.activity,
      recipe: activity.recipeSelected && activity.recipe,
      location: activity.location,
      achievementPoints: player.achievementPoints,
      gear: gear.equippedGear,
      factionReputation: player.factionReputation,
      segments: route.segments,
    };
  };

  const checkRequirements = (reqs, context = {}) => {
    if (!reqs || !reqs.length) return true;
    const baseData = getRequirementsContext();
    const data = {
      activity: context.activity || baseData.activity,
      recipe: context.recipe || baseData.receipe,
      location: context.location || baseData.location,
      achievementPoints:
        context.achievementPoints || baseData.achievementPoints,
      gear: context.equippedGear || baseData.gear,
      factionReputation:
        context.factionReputation || baseData.factionReputation,
      segments: context.segments || baseData.segments,
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
      segments,
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
        if (!location && activity) {
          const locationKeywords = segments.map(({ from }) => from.keywords);
          value = locationKeywords.some(
            (kw) =>
              intersect(kw, requirement.keywords).length ===
              requirement.keywords.length
          );
        }
        break;
      case "achievementPoint":
        value = achievementPoints >= requirement.value;
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
        if (location)
          value =
            location.faction === requirement.realm ||
            location.subFactions?.includes(requirement.realm);
        if (!location && activity) {
          const factionInfo = segments.map(({ from }) => {
            return { faction: from.faction, subFactions: from.subFactions };
          });
          value = factionInfo.some(
            ({ faction, subFactions }) =>
              faction === requirement.realm ||
              subFactions?.includes(requirement.realm)
          );
        }
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
      case "itemAnywhereWithYou":
      case "itemAnywhere":
        value = requirement.item in items.ownedItems;
        break;
      default:
        console.error("unhandled requirement", type, requirement);
    }

    return opposite ? !value : value;
  };

  return {
    getRequirementsContext,
    checkRequirements,
  };
}
