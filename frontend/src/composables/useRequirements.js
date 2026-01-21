import { intersect } from "../utils/intersect";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";

export function useRequirements(ctx) {
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();
  const dataStore = useDataStore();

  const checkRequirements = (reqs, context) => {
    if (!reqs || !reqs.length) return true;
    return reqs.every((requirements) =>
      checkRequirement(requirements, context || ctx),
    );
  };

  const checkRequirement = (req, context) => {
    const { type, opposite, requirement } = req;

    const equippedKeywordCounts = context.equippedGear.value
      ? context.equippedGear.value
          .filter((val) => "keywords" in val)
          .flatMap(({ keywords }) => keywords)
          .reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {})
      : {};

    let value = false;
    switch (type) {
      case "mainSkill":
        if (context.activity.value)
          value =
            context.activity.value.relatedSkillsList[0] === requirement.skill;
        if (context.recipe.value)
          value = context.recipe.value.relatedSkills[0] === requirement.skill;
        break;
      case "mainSkillType":
        if (context.activity.value)
          value =
            playerStore.skillsMap[context.activity.value.relatedSkillsList[0]]
              .type == requirement.type;
        if (context.recipe.value)
          value =
            playerStore.skillsMap[context.recipe.value.relatedSkills[0]].type ==
            requirement.type;
        break;
      case "locationHasKeywords":
        if (context.location.value) {
          value =
            intersect(context.location.value.keywords, requirement.keywords)
              .length === requirement.keywords.length;
        }
        if (!context.location.value && context.activity.value) {
          const locationKeywords = context.segments.value.map(
            ({ from }) => from.keywords,
          );
          value = locationKeywords.some(
            (kw) =>
              intersect(kw, requirement.keywords).length ===
              requirement.keywords.length,
          );
        }
        break;
      case "achievementPoint":
        value = context.achievementPoints.value >= requirement.value;
        break;
      case "distinctKeywordItemsEquipped":
        value = requirement.keywords.every(
          (kw) => equippedKeywordCounts[kw] >= requirement.quantity,
        );
        break;
      case "historyData":
        value = true;
        break;
      case "realm":
        if (context.location.value)
          value =
            context.location.value.faction === requirement.realm ||
            context.location.value.subFactions?.includes(requirement.realm);
        if (!context.location.value && context.activity.value) {
          const factionInfo = context.segments.value.map(({ from }) => {
            return { faction: from.faction, subFactions: from.subFactions };
          });
          value = factionInfo.some(
            ({ faction, subFactions }) =>
              faction === requirement.realm ||
              subFactions?.includes(requirement.realm),
          );
        }
        break;
      case "traveling":
        if (context.activity.value)
          value = context.activity.value.id === "travelling";
        break;
      case "gameData":
        if (context.factionReputation.value) {
          const { data, gameDataId } = requirement;
          const rep = JSON.parse(data).double || 0;
          value = context.factionReputation.value[gameDataId] >= rep;
        }
        break;
      case "skillLevel":
        value = playerStore.skillLevels[requirement.skill] >= requirement.level;
        break;
      case "activityType":
        if (context.source.value)
          value =
            ((requirement.activity &&
              context.source.value.id === requirement.activity) ||
              !requirement.source) &&
            ((requirement.keywords &&
              requirement.keywords.every((kw) =>
                context.source.value.keywords.includes(kw),
              )) ||
              !requirement.keywords);
        break;
      case "totalSkillLevel":
        value =
          Object.values(playerStore.skillLevels).reduce((a, b) => a + b, 0) >=
          requirement.levels;
        break;
      case "totalSkillLevelUps":
        value =
          Object.values(playerStore.skillLevels).reduce(
            (a, b) => a + b - 1,
            0,
          ) >= requirement.levels;
        break;
      case "itemAnywhereWithYou":
      case "itemAnywhere":
        value = requirement.item in itemsStore.ownedItems;
        break;
      case "keywordEquipped":
        value =
          ctx.equippedGear.value.filter((gear) => {
            const { keyword } = requirement;
            const kwCheck = gear.keywords?.includes(keyword);
            return kwCheck;
          }).length > 0;
        break;
      case "keywordWithLevelEquipped":
        value =
          ctx.equippedGear.value.filter((gear) => {
            const { keyword, skill, level } = requirement;
            const kwCheck = gear.keywords?.includes(keyword);

            const levelReqs = getLevelRequirementsMap(gear.requirements);
            const levelCheck = skill in levelReqs && levelReqs[skill] >= level;
            return kwCheck && levelCheck;
          }).length > 0;
        break;
      case "itemEquipped":
        value =
          ctx.equippedGear.value.findIndex(
            ({ id }) => id === requirement.item,
          ) >= 0;
        break;
      case "abilityAvailable":
        value =
          ctx.equippedGear.value.filter(({ abilities }) =>
            abilities
              ?.flatMap((ability) =>
                typeof ability === "object" ? ability.ability : ability,
              )
              .includes(requirement.ability),
          ).length > 0;
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
        const skill = playerStore.skillsMap[requirement.skill];
        out = {
          prefix: `While${opposite ? " NOT" : ""}`,
          text: skill.name,
          icon: skill.icon,
        };
      } else if (type == "mainSkillType") {
        out = {
          prefix: `While${opposite ? " NOT" : ""} doing`,
          text: `${requirement.type} skills`,
          icon: "",
        };
      } else if (type === "traveling") {
        out = {
          prefix: `While${opposite ? " NOT" : ""}`,
          text: "Traveling",
          icon: "",
        };
      } else if (type === "locationHasKeywords") {
        out = requirement.keywords
          .map(dataStore.getKeywordById)
          .filter(Boolean)
          .map(({ name, icon }) => ({
            prefix: `While${opposite ? " NOT" : ""} in`,
            text: `${name} location`,
            icon,
          }))[0];
      } else if (type === "realm") {
        const realm = playerStore.factionsMap[requirement.realm];
        out = {
          prefix: `While${opposite ? " NOT" : ""} in`,
          text: `${realm.name} area`,
          icon: realm.icon,
        };
      } else if (type === "distinctKeywordItemsEquipped") {
        const { quantity } = requirement;
        out = requirement.keywords
          .map(dataStore.getKeywordById)
          .filter(Boolean)
          .map(({ name, icon }) => ({
            prefix: `While${opposite ? " NOT" : ""} wearing ${quantity}`,
            text: name,
            icon,
          }))[0];
      } else if (type === "keywordEquipped") {
        const { keyword } = requirement;
        const kw = dataStore.getKeywordById(keyword);
        const { icon, name } = kw;

        out = {
          prefix: "Requires",
          text: `${name}`,
          icon,
        };
      } else if (type === "keywordWithLevelEquipped") {
        const { keyword, level, skill } = requirement;
        const kw = dataStore.getKeywordById(keyword);
        const { icon, name } = kw;

        out = {
          prefix: "Have",
          text: `${name} that requires at least ${level} ${skill}`,
          icon,
        };
      } else if (type === "achievementPoint") {
        out = {
          prefix: "Have",
          text: `${requirement.value} achievement points`,
          icon: "assets/icons/text/general_icons/achievement_point.png",
        };
      } else if (type === "historyData") {
        if (requirement.category === "stepsWalkedActivity") {
          // Not used anymore
          const act = activityStore.activitiesMap[requirement.data];
          out = {
            prefix: `Have taken ${requirement.value} steps on the`,
            text: `${act.name} activity`,
            icon: act.icon,
          };
        } else if (requirement.category === "actionCompleted") {
          const act = activityStore.activitiesMap[requirement.data];
          out = {
            prefix: `${opposite ? "NOT " : ""}Have completed`,
            text: `${act.name} activity ${requirement.value} times`,
            icon: act.icon,
          };
        }
      } else if (type === "skillLevel") {
        const skill = playerStore.skillsMap[requirement.skill];
        out = {
          prefix: `While at least ${requirement.level}`,
          text: skill.name,
          icon: skill.icon,
        };
      } else if (type === "totalSkillLevel") {
        const skillLevels = Object.values(playerStore.skillLevels).reduce(
          (a, b) => a + b,
          0,
        );

        out = {
          text: `Have ${Math.min(skillLevels, requirement.levels)}/${
            requirement.levels
          } total level`,
        };
      } else if (type === "totalSkillLevelUps") {
        const skillLevels = Object.values(playerStore.skillLevels).reduce(
          (a, b) => a + b - 1,
          0,
        );

        out = {
          text: `Level up your skills ${Math.min(
            skillLevels,
            requirement.levels,
          )}/${requirement.levels} times`,
        };
      } else if (type === "activityType") {
        const act = activityStore.activitiesMap[requirement.activity];
        if (requirement.keywords) {
          const kws = requirement.keywords.map(
            (kw) => dataStore.keywordsMap[kw],
          );
          out = {
            prefix: `While${opposite ? " NOT" : ""} doing`,
            text: `${kws[0].name} activity`,
            icon: kws[0].icon,
          };
        } else if (act) {
          out = {
            prefix: `While${opposite ? " NOT" : ""} doing`,
            text: `${act.name} activity`,
            icon: act.icon,
          };
        }
      } else if (type === "itemAnywhere" || type === "itemAnywhereWithYou") {
        const { item: itemID } = requirement;
        const item = itemsStore.allGearItems[itemID];
        if (item) {
          out = {
            prefix: `Own a`,
            text: item.name,
            icon: item.icon,
          };
        }
      } else if (type === "gameData") {
        const { gameDataId, data } = requirement;
        const rep = JSON.parse(data).double || 0;
        const reputationFaction = Object.values(playerStore.factions).find(
          ({ reputation }) => reputation === gameDataId,
        );
        if (reputationFaction) {
          const { name, icon } = reputationFaction;

          out = {
            prefix: `Requires ${rep}`,
            text: `${name} reputation`,
            icon,
          };
        }
      } else if (type === "itemEquipped") {
        const { item } = requirement;
        const itemObj = ctx.allGearItems.value[item];
        const { name, icon } = itemObj;

        out = {
          prefix: `Have`,
          text: `${name} equipped`,
          icon,
        };
      } else if (type === "abilityAvailable") {
        const { ability: abilityId } = requirement;
        const ability = dataStore.abilitiesMap[abilityId];
        const { name, icon } = ability;

        out = {
          prefix: "While having",
          icon,
          text: `${name} ability available`,
        };
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

  const mergeStrategies = {
    distinctKeywordItemsEquipped: {
      canMerge(a, b) {
        return (
          a.opposite === b.opposite &&
          JSON.stringify(a.requirement.keywords) ===
            JSON.stringify(b.requirement.keywords)
        );
      },

      merge(a, b) {
        return {
          ...a,
          requirement: {
            ...a.requirement,
            quantity: Math.max(a.requirement.quantity, b.requirement.quantity),
          },
        };
      },
    },
    abilityAvailable: {
      canMerge(a, b) {
        return (
          a.opposite === b.opposite &&
          a.requirement.ability === b.requirement.ability
        );
      },
      merge(a, b) {
        return a || b;
      },
    },
    skillLevel: {
      canMerge(a, b) {
        return (
          a.opposite === b.opposite &&
          a.requirement.skill === b.requirement.skill
        );
      },
      merge(a, b) {
        return {
          ...a,
          requirement: {
            ...a.requirement,
            level: Math.max(a.requirement.level, b.requirement.level),
          },
        };
      },
    },
  };

  const mergeRequirements = (requirements) => {
    const result = [];

    for (const req of requirements) {
      const strategy = mergeStrategies[req.type];

      if (!strategy) {
        // Unknown type → never merge
        result.push(req);
        continue;
      }

      let merged = false;

      for (let i = 0; i < result.length; i++) {
        const existing = result[i];

        if (existing.type === req.type && strategy.canMerge(existing, req)) {
          result[i] = strategy.merge(existing, req);
          merged = true;
          break;
        }
      }

      if (!merged) {
        result.push(req);
      }
    }

    return result;
  };

  const getLevelRequirementsMap = (requirements) => {
    if (!requirements) return {};
    const map = {};
    requirements.forEach(({ type, requirement }) => {
      if (type !== "skillLevel") return;
      const { level, skill } = requirement;
      map[skill] = level;
    });
    return map;
  };

  return {
    checkRequirement,
    checkRequirements,
    mapRequirementsText,
    mergeRequirements,
    getLevelRequirementsMap,
  };
}
