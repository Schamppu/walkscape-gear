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
import type { Keyword } from "@/domain/types/keyword";
import { getLevelRequirementsMap, mergeRequirements } from "@/domain/requirements/requirementUtils";

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
  location: Ref<LocationDetail | null>;
  segments: Ref<RequirementSegment[]>;
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

  const checkRequirement = (
    req: Requirement,
    context: RequirementContext = ctx,
  ): boolean => {
    const { type, opposite, requirement } = req;

    const equippedKeywordCounts: Record<string, number> = context.equippedGear
      .value
      ? context.equippedGear.value
          .filter((val): val is RequirementItem & { keywords: string[] } =>
            "keywords" in val,
          )
          .flatMap(({ keywords }) => keywords)
          .reduce<Record<string, number>>((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {})
      : {};

    let value = false;

    switch (type) {
      case "mainSkill": {
        const skill = requirement["skill"] as string;
        const activity = context.activity.value as ActivityDetail | null;
        const recipe = context.recipe.value as RecipeDetail | null;
        if (activity?.relatedSkillsList)
          value = activity.relatedSkillsList[0] === skill;
        if (recipe?.relatedSkills) value = recipe.relatedSkills[0] === skill;
        break;
      }

      case "mainSkillType": {
        const reqType = requirement["type"] as string;
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
        const keywords = requirement["keywords"] as string[];
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
        value =
          context.achievementPoints.value >=
          (requirement["value"] as number);
        break;

      case "distinctKeywordItemsEquipped": {
        const keywords = requirement["keywords"] as string[];
        const quantity = requirement["quantity"] as number;
        value = keywords.every((kw) => equippedKeywordCounts[kw] >= quantity);
        break;
      }

      case "historyData":
        value = true;
        break;

      case "realm": {
        const realm = requirement["realm"] as string;
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

      case "gameData": {
        const factionReputation = context.factionReputation.value;
        if (factionReputation) {
          const data = requirement["data"] as string;
          const gameDataId = requirement["gameDataId"] as string;
          const rep = (JSON.parse(data) as { double?: number }).double ?? 0;
          value = factionReputation[gameDataId] >= rep;
        }
        break;
      }

      case "skillLevel": {
        const skill = requirement["skill"] as string;
        const level = requirement["level"] as number;
        value = playerStore.skillLevels[skill] >= level;
        break;
      }

      case "activityType": {
        const source = context.source.value;
        if (source) {
          const reqActivity = requirement["activity"] as string | undefined;
          const reqKeywords = requirement["keywords"] as string[] | undefined;
          value =
            ((!reqActivity || source.id === reqActivity) &&
              (!reqKeywords ||
                reqKeywords.every((kw) => source.keywords.includes(kw))));
        }
        break;
      }

      case "totalSkillLevel":
        value =
          Object.values(playerStore.skillLevels).reduce((a, b) => a + b, 0) >=
          (requirement["levels"] as number);
        break;

      case "totalSkillLevelUps":
        value =
          Object.values(playerStore.skillLevels).reduce(
            (a, b) => a + b - 1,
            0,
          ) >= (requirement["levels"] as number);
        break;

      case "itemAnywhereWithYou":
      case "itemAnywhere":
        value = (requirement["item"] as string) in itemsStore.ownedItems;
        break;

      case "keywordEquipped": {
        const keyword = requirement["keyword"] as string;
        value =
          ctx.equippedGear.value.some((gear) =>
            gear.keywords?.includes(keyword),
          );
        break;
      }

      case "keywordWithLevelEquipped": {
        const keyword = requirement["keyword"] as string;
        const skill = requirement["skill"] as string;
        const level = requirement["level"] as number;
        value = ctx.equippedGear.value.some((gear) => {
          const kwCheck = gear.keywords?.includes(keyword);
          const levelReqs = getLevelRequirementsMap(gear.requirements);
          const levelCheck = skill in levelReqs && levelReqs[skill] >= level;
          return kwCheck && levelCheck;
        });
        break;
      }

      case "itemEquipped": {
        const item = requirement["item"] as string;
        value = ctx.equippedGear.value.some(({ id }) => id === item);
        break;
      }

      case "abilityAvailable": {
        const ability = requirement["ability"] as string;
        value = ctx.equippedGear.value.some(({ abilities }) =>
          abilities
            ?.flatMap((a) => (typeof a === "object" ? a.ability : a))
            .includes(ability),
        );
        break;
      }

      default:
        console.error("unhandled requirement", type, requirement);
    }

    return opposite ? !value : value;
  };

  // -------------------------------------------------------------------------
  // Requirement display text
  // -------------------------------------------------------------------------

  const mapRequirementsText = (
    requirements: Requirement[],
    requirementsActive: boolean[],
  ): RequirementDisplay[] => {
    return requirements.map((req, idx) => {
      const { type, opposite, requirement } = req;
      const active = requirementsActive[idx];

      let out: Omit<RequirementDisplay, "active"> | undefined;

      if (type === "mainSkill") {
        const skill = playerStore.skillsMap[requirement["skill"] as string];
        out = {
          prefix: `While${opposite ? " NOT" : ""}`,
          text: skill.name,
          icon: skill.icon,
        };
      } else if (type === "mainSkillType") {
        out = {
          prefix: `While${opposite ? " NOT" : ""} doing`,
          text: `${requirement["type"] as string} skills`,
          icon: "",
        };
      } else if (type === "traveling") {
        out = {
          prefix: `While${opposite ? " NOT" : ""}`,
          text: "Traveling",
          icon: "",
        };
      } else if (type === "locationHasKeywords") {
        const keywords = requirement["keywords"] as string[];
        const resolvedKws = keywords
          .map(dataStore.getKeywordById)
          .filter((kw): kw is Keyword => kw !== null);
        out = resolvedKws.map(({ name, icon }) => ({
            prefix: `While${opposite ? " NOT" : ""} in`,
            text: `${name} location`,
            icon,
          }))[0];
      } else if (type === "realm") {
        const realm = playerStore.factionsMap[requirement["realm"] as string];
        out = {
          prefix: `While${opposite ? " NOT" : ""} in`,
          text: `${realm.name} area`,
          icon: realm.icon,
        };
      } else if (type === "distinctKeywordItemsEquipped") {
        const keywords = requirement["keywords"] as string[];
        const quantity = requirement["quantity"] as number;
        const resolvedKws = keywords
          .map(dataStore.getKeywordById)
          .filter((kw): kw is Keyword => kw !== null);
        out = resolvedKws.map(({ name, icon }) => ({
            prefix: `While${opposite ? " NOT" : ""} wearing ${quantity}`,
            text: name,
            icon,
          }))[0];
      } else if (type === "keywordEquipped") {
        const kw = dataStore.getKeywordById(requirement["keyword"] as string);
        if (kw) {
          out = { prefix: "Requires", text: kw.name, icon: kw.icon };
        }
      } else if (type === "keywordWithLevelEquipped") {
        const kw = dataStore.getKeywordById(requirement["keyword"] as string);
        const level = requirement["level"] as number;
        const skill = requirement["skill"] as string;
        if (kw) {
          out = {
            prefix: "Have",
            text: `${kw.name} that requires at least ${level} ${skill}`,
            icon: kw.icon,
          };
        }
      } else if (type === "achievementPoint") {
        out = {
          prefix: "Have",
          text: `${requirement["value"] as number} achievement points`,
          icon: "assets/icons/text/general_icons/achievement_point.png",
        };
      } else if (type === "historyData") {
        const category = requirement["category"] as string;
        const data = requirement["data"] as string;
        const value = requirement["value"] as number;
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
      } else if (type === "skillLevel") {
        const skill = playerStore.skillsMap[requirement["skill"] as string];
        out = {
          prefix: `While at least ${requirement["level"] as number}`,
          text: skill.name,
          icon: skill.icon,
        };
      } else if (type === "totalSkillLevel") {
        const levels = requirement["levels"] as number;
        const current = Object.values(playerStore.skillLevels).reduce(
          (a, b) => a + b,
          0,
        );
        out = {
          text: `Have ${Math.min(current, levels)}/${levels} total level`,
        };
      } else if (type === "totalSkillLevelUps") {
        const levels = requirement["levels"] as number;
        const current = Object.values(playerStore.skillLevels).reduce(
          (a, b) => a + b - 1,
          0,
        );
        out = {
          text: `Level up your skills ${Math.min(current, levels)}/${levels} times`,
        };
      } else if (type === "activityType") {
        const reqActivity = requirement["activity"] as string | undefined;
        const reqKeywords = requirement["keywords"] as string[] | undefined;
        const act = reqActivity
          ? activityStore.activitiesMap[reqActivity]
          : undefined;

        if (reqKeywords?.length) {
          const kws = reqKeywords.map((kw) => dataStore.keywordsMap[kw]);
          if (kws[0]) {
            out = {
              prefix: `While${opposite ? " NOT" : ""} doing`,
              text: `${kws[0].name} activity`,
              icon: kws[0].icon,
            };
          }
        } else if (act) {
          out = {
            prefix: `While${opposite ? " NOT" : ""} doing`,
            text: `${act.name} activity`,
            icon: act.icon,
          };
        }
      } else if (type === "itemAnywhere" || type === "itemAnywhereWithYou") {
        const item = ctx.allGearItems.value[requirement["item"] as string];
        if (item) {
          out = { prefix: "Own a", text: item.name, icon: item.icon };
        }
      } else if (type === "gameData") {
        const gameDataId = requirement["gameDataId"] as string;
        const data = requirement["data"] as string;
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
      } else if (type === "itemEquipped") {
        const item = ctx.allGearItems.value[requirement["item"] as string];
        if (item) {
          out = {
            prefix: "Have",
            text: `${item.name} equipped`,
            icon: item.icon,
          };
        }
      } else if (type === "abilityAvailable") {
        const ability = dataStore.abilitiesMap[requirement["ability"] as string];
        if (ability) {
          out = {
            prefix: "While having",
            text: `${ability.name} ability available`,
            icon: ability.icon,
          };
        }
      }

      if (out) return { ...out, active };

      // Fallback for unhandled / unknown requirement types
      return { text: type, icon: "", active };
    });
  };

  return {
    checkRequirement,
    checkRequirements,
    mapRequirementsText,
    mergeRequirements,
    getLevelRequirementsMap,
  };
}
