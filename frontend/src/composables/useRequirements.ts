import type { Ref } from "vue";
import { intersect } from "@/utils/intersect";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";
import type { Requirement } from "@/domain/types/common";
import type { ActivityDetail } from "@/domain/types/activity";
import type { ActivityNone } from "@/domain/constants/activityNone";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { LocationDetail } from "@/domain/types/location";
import type { ServiceDetail } from "@/domain/types/service";
import type { Keyword } from "@/domain/types/keyword";
import { serviceTiers } from "@/domain/constants/services";
import {
  getLevelRequirementsMap,
  mergeRequirements,
} from "@/domain/requirements/requirementUtils";
import icons from "@/constants/iconPaths";
import { capitalize } from "@/utils/string";

// Re-export pure functions so callers only need one import.
export { getLevelRequirementsMap, mergeRequirements };

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

/** Minimal shape required from each equipped item for requirement evaluation. */
export type RequirementItem = {
  id: string;
  keywords?: string[];
  requirements?: Requirement[];
  /** Some items carry abilities; can be a raw ID string or an object. */
  abilities?: (string | { ability: string })[];
};

/** A route segment - only the location fields needed for requirement checks. */
export type RequirementSegment = {
  from: {
    keywords: string[];
    faction: string;
    subFactions?: string[];
  };
};

/** Activity/recipe source for activityType requirement checks. */
export type RequirementSource = {
  id: string;
  keywords: string[];
};

/**
 * All reactive references the composable reads when evaluating requirements.
 * Component authors pass this as `ctx`; individual `checkRequirement` calls may
 * override it via the optional second `context` argument.
 */
export type RequirementContext = {
  equippedGear: Ref<RequirementItem[]>;
  activity: Ref<ActivityDetail | ActivityNone | null>;
  recipe: Ref<RecipeDetail | ActivityNone | null>;
  service?: Ref<ServiceDetail | null>;
  location: Ref<LocationDetail | null>;
  segments: Ref<RequirementSegment[]>;
  characterLevel: Ref<number>;
  skillLevels: Ref<Record<string, number>>;
  achievementPoints: Ref<number>;
  factionReputation: Ref<Record<string, number> | null>;
  source: Ref<RequirementSource | null>;
  allGearItems: Ref<Record<string, { name: string; icon: string }>>;
};

/** A single rendered requirement entry ready for display in the UI. */
export type RequirementDisplay = {
  prefix?: string;
  text: string;
  icon?: string;
  active: boolean;
};

export type RequirementDisplayType = "stat" | "item";

export type RequirementOwner = {
  requirements?: Requirement[] | null;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useRequirements(ctx: RequirementContext) {
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();
  const dataStore = useDataStore();

  // -------------------------------------------------------------------------
  // Requirement checking
  // -------------------------------------------------------------------------

  const checkRequirements = (
    reqs: Requirement[] | null | undefined,
    context: RequirementContext = ctx,
  ): boolean => {
    if (!reqs || !reqs.length) return true;
    return reqs.every((req) => checkRequirement(req, context));
  };

  const canBeEquipped = (
    item: RequirementOwner | null | undefined,
    context: RequirementContext = ctx,
  ): boolean => checkRequirements(item?.requirements, context);

  const checkRequirement = (
    req: Requirement,
    context: RequirementContext = ctx,
  ): boolean => {
    const { opposite } = req;

    const equippedKeywordCounts: Record<string, number> = context.equippedGear
      .value
      ? context.equippedGear.value
          .filter(
            (val): val is RequirementItem & { keywords: string[] } =>
              "keywords" in val,
          )
          .flatMap(({ keywords }) => keywords)
          .reduce<Record<string, number>>((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {})
      : {};

    let value = false;

    switch (req.type) {
      case "mainSkill": {
        const { skill } = req.requirement;
        const activity = context.activity.value as ActivityDetail | null;
        const recipe = context.recipe.value as RecipeDetail | null;
        if (activity?.relatedSkillsList)
          value = activity.relatedSkillsList[0] === skill;
        if (recipe?.relatedSkills) value = recipe.relatedSkills[0] === skill;
        break;
      }

      case "mainSkillType": {
        const { type: reqType } = req.requirement;
        const activity = context.activity.value as ActivityDetail | null;
        const recipe = context.recipe.value as RecipeDetail | null;
        if (activity?.relatedSkillsList)
          value =
            playerStore.skillsMap[activity.relatedSkillsList[0]]?.type ===
            reqType;
        if (recipe?.relatedSkills)
          value =
            playerStore.skillsMap[recipe.relatedSkills[0]]?.type === reqType;
        break;
      }

      case "locationHasKeywords": {
        const { keywords } = req.requirement;
        if (context.location.value) {
          value =
            intersect(context.location.value.keywords, keywords).length ===
            keywords.length;
        } else if (context.activity.value) {
          const locationKeywords = context.segments.value.map(
            ({ from }) => from.keywords,
          );
          value = locationKeywords.some(
            (kw) => intersect(kw, keywords).length === keywords.length,
          );
        }
        break;
      }

      case "achievementPoint":
        value = context.achievementPoints.value >= req.requirement.value;
        break;

      case "distinctKeywordItemsEquipped": {
        const { keywords, quantity } = req.requirement;
        value = keywords.every((kw) => equippedKeywordCounts[kw] >= quantity);
        break;
      }

      case "historyData":
        value = true;
        break;

      case "realm": {
        const { realm } = req.requirement;
        if (context.location.value) {
          value =
            context.location.value.faction === realm ||
            context.location.value.subFactions?.includes(realm) === true;
        } else if (context.activity.value) {
          const factionInfo = context.segments.value.map(({ from }) => ({
            faction: from.faction,
            subFactions: from.subFactions,
          }));
          value = factionInfo.some(
            ({ faction, subFactions }) =>
              faction === realm || subFactions?.includes(realm) === true,
          );
        }
        break;
      }

      case "traveling": {
        const activity = context.activity.value;
        if (activity) value = activity.id === "travelling";
        break;
      }

      case "service": {
        const selectedService = context.service?.value ?? activityStore.service;
        if (!selectedService) {
          value = false;
          break;
        }

        const { keywords, serviceKeyword, tier } = req.requirement;
        const reqKeywords = keywords && keywords.length ? [...keywords] : [];
        if (serviceKeyword) reqKeywords.push(serviceKeyword);

        const selectedTierIndex = serviceTiers.indexOf(
          selectedService.tier as (typeof serviceTiers)[number],
        );
        const reqTierIndex = serviceTiers.indexOf(
          tier as (typeof serviceTiers)[number],
        );

        const tierOk =
          selectedTierIndex >= 0 && reqTierIndex >= 0
            ? selectedTierIndex >= reqTierIndex
            : selectedService.tier === tier;
        const keywordsOk = reqKeywords.every((kw) =>
          selectedService.keywords.includes(kw),
        );

        value = tierOk && keywordsOk;
        break;
      }

      case "gameData": {
        const factionReputation = context.factionReputation.value;
        if (factionReputation) {
          const { data, gameDataId } = req.requirement;
          const rep = (JSON.parse(data) as { double?: number }).double ?? 0;
          value = factionReputation[gameDataId] >= rep;
        }
        break;
      }

      case "characterLevel": {
        const { level } = req.requirement;
        value = ctx.characterLevel.value >= level;
        break;
      }

      case "skillLevel": {
        const { skill, level } = req.requirement;
        value = ctx.skillLevels.value[skill] >= level;
        break;
      }

      case "skillTypeLevel": {
        const { type, relativeLevel } = req.requirement;
        const skillsByType = Object.entries(playerStore.skillsMap).filter(
          ([,s]) => s.type === type,
        );
        const skillIds = skillsByType.map(([id]) => id);
        const maximum = 98 * skillsByType.length;
        const required = relativeLevel * maximum;
        const current = skillIds.reduce(
          (a, id) => a + ctx.skillLevels.value[id] - 1,
          0,
        );
        value = current >= required;
        break;
      }

      case "activityType": {
        const source = context.source.value;
        if (source) {
          const { activity: reqActivity, keywords: reqKeywords } =
            req.requirement;
          value =
            (!reqActivity || source.id === reqActivity) &&
            (!reqKeywords?.length ||
              reqKeywords.every((kw) => source.keywords.includes(kw)));
        }
        break;
      }

      case "totalSkillLevel":
        value =
          Object.values(playerStore.skillLevels).reduce((a, b) => a + b, 0) >=
          req.requirement.levels;
        break;

      case "totalSkillLevelUps":
        value =
          Object.values(playerStore.skillLevels).reduce(
            (a, b) => a + b - 1,
            0,
          ) >= req.requirement.levels;
        break;

      case "itemAnywhereWithYou":
      case "itemAnywhere":
        value = req.requirement.item in itemsStore.ownedItems;
        break;

      case "keywordEquipped":
        value = ctx.equippedGear.value.some((gear) =>
          gear.keywords?.includes(req.requirement.keyword),
        );
        break;

      case "keywordWithLevelEquipped": {
        const { keyword, skill, level } = req.requirement;
        value = ctx.equippedGear.value.some((gear) => {
          const kwCheck = gear.keywords?.includes(keyword);
          const levelReqs = getLevelRequirementsMap(gear.requirements);
          const levelCheck = skill in levelReqs && levelReqs[skill] >= level;
          return kwCheck && levelCheck;
        });
        break;
      }

      case "itemEquipped":
        value = ctx.equippedGear.value.some(
          ({ id }) => id === req.requirement.item,
        );
        break;

      case "abilityAvailable": {
        const { ability } = req.requirement;
        value = ctx.equippedGear.value.some(({ abilities }) =>
          abilities
            ?.flatMap((a) => (typeof a === "object" ? a.ability : a))
            .includes(ability),
        );
        break;
      }

      default:
        console.error("unhandled requirement", req);
    }

    return opposite ? !value : value;
  };

  // -------------------------------------------------------------------------
  // Requirement display text
  // -------------------------------------------------------------------------

  const mapRequirementsText = (
    requirements: Requirement[],
    requirementsActive: boolean[],
    displayType: RequirementDisplayType = "stat",
  ): RequirementDisplay[] => {
    return requirements.map((req, idx) => {
      const { opposite } = req;
      const active = requirementsActive[idx];
      const requirementPrefix =
        displayType === "item"
          ? `Requires${opposite ? " NOT" : ""}`
          : `While${opposite ? " NOT" : ""}`;

      let out: Omit<RequirementDisplay, "active"> | undefined;

      switch (req.type) {
        case "mainSkill": {
          const skill = playerStore.skillsMap[req.requirement.skill];
          out = {
            prefix: requirementPrefix,
            text: skill.name,
            icon: skill.icon,
          };
          break;
        }

        case "mainSkillType":
          out = {
            prefix: `${requirementPrefix} doing`,
            text: `${req.requirement.type} skills`,
            icon: "",
          };
          break;

        case "traveling":
          out = { prefix: requirementPrefix, text: "Traveling", icon: "" };
          break;

        case "service": {
          const { keywords, serviceKeyword, tier } = req.requirement;
          const reqKeywords = keywords && keywords.length ? [...keywords] : [];
          if (serviceKeyword) reqKeywords.push(serviceKeyword);

          out = {
            prefix: "Requires",
            text: reqKeywords.length
              ? `${tier}+ ${reqKeywords.join(", ")} service`
              : `${tier}+ service`,
            icon: "",
          };
          break;
        }

        case "locationHasKeywords": {
          const resolvedKw = req.requirement.keywords
            .map(dataStore.getKeywordById)
            .filter((kw): kw is Keyword => kw !== null)[0];
          if (resolvedKw) {
            out = {
              prefix: `${requirementPrefix} in`,
              text: `${resolvedKw.name} location`,
              icon: resolvedKw.icon,
            };
          }
          break;
        }

        case "realm": {
          const realm = playerStore.factionsMap[req.requirement.realm];
          out = {
            prefix: `${requirementPrefix} in`,
            text: `${realm.name} area`,
            icon: realm.icon,
          };
          break;
        }

        case "distinctKeywordItemsEquipped": {
          const { keywords, quantity } = req.requirement;
          const resolvedKw = keywords
            .map(dataStore.getKeywordById)
            .filter((kw): kw is Keyword => kw !== null)[0];
          if (resolvedKw) {
            out = {
              prefix: `${requirementPrefix} wearing ${quantity}`,
              text: resolvedKw.name,
              icon: resolvedKw.icon,
            };
          }
          break;
        }

        case "keywordEquipped": {
          const kw = dataStore.getKeywordById(req.requirement.keyword);
          if (kw) out = { prefix: "Requires", text: kw.name, icon: kw.icon };
          break;
        }

        case "keywordWithLevelEquipped": {
          const { keyword, level, skill } = req.requirement;
          const kw = dataStore.getKeywordById(keyword);
          if (kw) {
            out = {
              prefix: "Have",
              text: `${kw.name} that requires at least ${level} ${skill}`,
              icon: kw.icon,
            };
          }
          break;
        }

        case "achievementPoint":
          out = {
            prefix: "Have",
            text: `${req.requirement.value} achievement point${req.requirement.value !== 1 ? "s" : ""}`,
            icon: "assets/icons/text/general_icons/achievement_point.png",
          };
          break;

        case "historyData": {
          const { category, data, value } = req.requirement;
          const act = activityStore.activitiesMap[data];
          if (category === "stepsWalkedActivity" && act) {
            out = {
              prefix: `Have taken ${value} steps on the`,
              text: `${act.name} activity`,
              icon: act.icon,
            };
          } else if (category === "actionCompleted" && act) {
            out = {
              prefix: `${opposite ? "NOT " : ""}Have completed`,
              text: `${act.name} activity ${value} times`,
              icon: act.icon,
            };
          }
          break;
        }

        case "characterLevel": {
          const { level } = req.requirement;
          out = {
            prefix: requirementPrefix,
            text: `Character level ${level}`,
            icon: icons.character,
          };
          break;
        }

        case "skillLevel": {
          const { skill, level } = req.requirement;
          const skillData = playerStore.skillsMap[skill];
          out = {
            prefix: `${requirementPrefix} at least ${level}`,
            text: skillData.name,
            icon: skillData.icon,
          };
          break;
        }

        case "skillTypeLevel": {
          const { type, relativeLevel } = req.requirement;
          const skillsByType = Object.entries(playerStore.skillsMap).filter(
            ([, s]) => s.type === type,
          );
          const skillIds = skillsByType.map(([id]) => id);
          const [, skill] = skillsByType[0];
          const target = relativeLevel * 100;
          const current = skillIds.reduce(
            (a, b) => a + ctx.skillLevels.value[b] - 1,
            0,
          );
          out = {
            prefix: `Have ${target}% towards maximum`,
            text: `${capitalize(skill.type)} level (${Math.min(current, target)}/${target})`,
            icon: skill.typeIcon,
          };
          break;
        }

        case "totalSkillLevel": {
          const { levels } = req.requirement;
          const current = Object.values(playerStore.skillLevels).reduce(
            (a, b) => a + b,
            0,
          );
          out = {
            text: `Have ${Math.min(current, levels)}/${levels} total level`,
          };
          break;
        }

        case "totalSkillLevelUps": {
          const { levels } = req.requirement;
          const current = Object.values(playerStore.skillLevels).reduce(
            (a, b) => a + b - 1,
            0,
          );
          out = {
            text: `Level up your skills ${Math.min(current, levels)}/${levels} times`,
          };
          break;
        }

        case "activityType": {
          const { activity: reqActivity, keywords: reqKeywords } =
            req.requirement;
          const act = reqActivity
            ? activityStore.activitiesMap[reqActivity]
            : undefined;
          if (reqKeywords?.length) {
            const kw = dataStore.keywordsMap[reqKeywords[0]];
            if (kw) {
              out = {
                prefix: `${requirementPrefix} doing`,
                text: `${kw.name} activity`,
                icon: kw.icon,
              };
            }
          } else if (act) {
            out = {
              prefix: `${requirementPrefix} doing`,
              text: `${act.name} activity`,
              icon: act.icon,
            };
          }
          break;
        }

        case "itemAnywhere":
        case "itemAnywhereWithYou": {
          const item = ctx.allGearItems.value[req.requirement.item];
          if (item) out = { prefix: "Own a", text: item.name, icon: item.icon };
          break;
        }

        case "gameData": {
          const { gameDataId, data } = req.requirement;
          const rep = (JSON.parse(data) as { double?: number }).double ?? 0;
          const reputationFaction = Object.values(playerStore.factions).find(
            ({ reputation }) => reputation === gameDataId,
          );
          if (reputationFaction) {
            out = {
              prefix: `Requires ${rep}`,
              text: `${reputationFaction.name} reputation`,
              icon: reputationFaction.icon,
            };
          }
          break;
        }

        case "itemEquipped": {
          const item = ctx.allGearItems.value[req.requirement.item];
          if (item) {
            out = {
              prefix: "Have",
              text: `${item.name} equipped`,
              icon: item.icon,
            };
          }
          break;
        }

        case "abilityAvailable": {
          const ability = dataStore.abilitiesMap[req.requirement.ability];
          if (ability) {
            out = {
              prefix: "While having",
              text: `${ability.name} ability available`,
              icon: ability.icon,
            };
          }
          break;
        }
      }

      if (out) return { ...out, active };

      // Fallback for unhandled / unknown requirement types
      return { text: req.type, icon: "", active };
    });
  };

  return {
    checkRequirement,
    checkRequirements,
    canBeEquipped,
    mapRequirementsText,
    mergeRequirements,
    getLevelRequirementsMap,
  };
}
