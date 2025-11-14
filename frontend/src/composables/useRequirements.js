import { intersect } from "../utils/intersect";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useRouteStore } from "@/store/route";
import { useDataStore } from "@/store/data";

export function useRequirements() {
  const activity = useActivityStore();
  const gear = useGearStore();
  const player = usePlayerStore();
  const items = useItemsStore();
  const route = useRouteStore();
  const data = useDataStore();

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
      recipe: context.recipe || baseData.recipe,
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

  const mapRequirementsText = (requirements, requirementsActive) => {
    return requirements.map((req, idx) => {
      const { type, opposite, requirement } = req;
      let out;
      if (type === "mainSkill") {
        const skill = player.skillsMap[requirement.skill];
        out = {
          prefix: `While${opposite ? " NOT" : ""}`,
          text: skill.name,
          icon: skill.icon,
        };
      } else if (type === "traveling") {
        out = {
          prefix: `While${opposite ? " NOT" : ""}`,
          text: "Traveling",
          icon: "",
        };
      } else if (type === "locationHasKeywords") {
        out = requirement.keywords
          .map(data.getKeywordById)
          .filter(Boolean)
          .map(({ name, icon }) => ({
            prefix: `While${opposite ? " NOT" : ""} in`,
            text: `${name} location`,
            icon,
          }))[0];
      } else if (type === "realm") {
        const realm = player.factionsMap[requirement.realm];
        out = {
          prefix: `While${opposite ? " NOT" : ""} in`,
          text: `${realm.name} area`,
          icon: realm.icon,
        };
      } else if (type === "distinctKeywordItemsEquipped") {
        const { quantity } = requirement;
        out = requirement.keywords
          .map(data.getKeywordById)
          .filter(Boolean)
          .map(({ name, icon }) => ({
            prefix: `While${opposite ? " NOT" : ""} wearing ${quantity}`,
            text: name,
            icon,
          }))[0];
      } else if (type === "achievementPoint") {
        out = {
          prefix: "Have",
          text: `${requirement.value} achievement points`,
          icon: "assets/icons/text/general_icons/achievement_point.png",
        };
      } else if (type === "historyData") {
        if (requirement.category === "stepsWalkedActivity") {
          // Not used anymore
          const activity = activity.activitiesMap[requirement.data];
          out = {
            prefix: `Have taken ${requirement.value} steps on the`,
            text: `${activity.name} activity`,
            icon: activity.icon,
          };
        } else if (requirement.category === "actionCompleted") {
          const activity = activity.activitiesMap[requirement.data];
          out = {
            prefix: `Have completed`,
            text: `${activity.name} activity ${requirement.value} times`,
            icon: activity.icon,
          };
        }
      } else if (type === "skillLevel") {
        const skill = player.skillsMap[requirement.skill];
        out = {
          prefix: `While at least ${requirement.level}`,
          text: skill.name,
          icon: skill.icon,
        };
      } else if (type === "totalSkillLevelUps") {
        const skillLevels = Object.values(player.skillLevels).reduce(
          (a, b) => a + b - 1,
          0
        );

        out = {
          text: `Level up your skills ${Math.min(
            skillLevels,
            requirement.levels
          )}/${requirement.levels} times`,
        };
      } else if (type === "activityType") {
        const activity = activity.activitiesMap[requirement.activity];
        if (activity) {
          out = {
            prefix: `While${opposite ? " NOT" : ""} doing`,
            text: `${activity.name} activity`,
            icon: activity.icon,
          };
        }
      } else if (type === "itemAnywhere" || type === "itemAnywhereWithYou") {
        const { item: itemID } = requirement;
        const item = items.allItems[itemID];
        if (item) {
          out = {
            prefix: `Own a`,
            text: item.name,
            icon: item.icon,
          };
        }
      }
      if (out) {
        const active = requirementsActive[idx];
        return {
          ...out,
          active,
        };
      }
      return {
        text: requirement,
        icon: "",
      };
    });
  };

  return {
    getRequirementsContext,
    checkRequirements,
    mapRequirementsText,
  };
}
