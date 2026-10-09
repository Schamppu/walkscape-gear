/**
 * Purpose:
 * Pure requirement checks for a gear set being scored by an optimiser worker:
 * attribute requirements against the set's items and location, filtering of
 * static entries, and ring / tool duplicate and banned-keyword filtering.
 *
 * Used by the advanced optimiser (which the quick set also runs on).
 *
 * Does NOT:
 * - Import Vue / reactive APIs.
 * - Access Pinia stores.
 */

import { serviceTiers } from "@/domain/constants/services";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { Requirement } from "@/domain/types/common";
import type { LocationSummary } from "@/domain/types/location";
import type {
  StaticReqCtx,
  WorkerGearSet,
  WorkerItem,
} from "@/workers/optimiserWorkerTypes";

// ---------------------------------------------------------------------------
// Requirement checking
// ---------------------------------------------------------------------------

export type DynCtx = {
  equippedKeywordCounts: Record<string, number>;
  equippedGear: WorkerItem[];
  locationKeywords: string[];
  locationFaction: string | null;
  locationSubFactions: string[];
};

export function requirementsMet(
  requirements: Requirement[] | null | undefined,
  sCtx: StaticReqCtx,
  dCtx: DynCtx,
): boolean {
  if (!requirements?.length) return true;
  return requirements.every((req) => checkRequirement(req, sCtx, dCtx));
}

function checkRequirement(req: Requirement, sCtx: StaticReqCtx, dCtx: DynCtx): boolean {
  const { opposite } = req;
  let value = false;

  switch (req.type) {
    case "mainSkill": {
      const skills = sCtx.isActivity ? sCtx.activityRelatedSkills : sCtx.recipeRelatedSkills;
      value = skills[0] === req.requirement.skill;
      break;
    }
    case "mainSkillType": {
      const skills = sCtx.isActivity ? sCtx.activityRelatedSkills : sCtx.recipeRelatedSkills;
      value = sCtx.skillsMap[skills[0]]?.type === req.requirement.type;
      break;
    }
    case "locationHasKeywords": {
      const { keywords } = req.requirement;
      if (dCtx.locationKeywords.length) {
        value = keywords.every((kw) => dCtx.locationKeywords.includes(kw));
      } else {
        value = sCtx.segments.some((s) => keywords.every((kw) => s.keywords.includes(kw)));
      }
      break;
    }
    case "achievementPoint":
      value = sCtx.achievementPoints >= req.requirement.value;
      break;
    case "distinctKeywordItemsEquipped": {
      const { keywords, quantity } = req.requirement;
      value = keywords.every((kw) => (dCtx.equippedKeywordCounts[kw] ?? 0) >= quantity);
      break;
    }
    case "historyData":
      value = true;
      break;
    case "realm": {
      const { realm } = req.requirement;
      if (dCtx.locationFaction) {
        value =
          dCtx.locationFaction === realm ||
          (dCtx.locationSubFactions ?? []).includes(realm);
      } else {
        value = sCtx.segments.some(
          (s) => s.faction === realm || s.subFactions?.includes(realm),
        );
      }
      break;
    }
    case "traveling":
      value = sCtx.activityId === "travelling";
      break;
    case "service": {
      const { keywords, serviceKeyword, tier } = req.requirement;
      const reqKeywords = keywords && keywords.length ? [...keywords] : [];
      if (serviceKeyword) reqKeywords.push(serviceKeyword);

      const selectedTier = sCtx.selectedServiceTier;
      if (!selectedTier) {
        value = false;
        break;
      }

      const selectedTierIndex = serviceTiers.indexOf(
        selectedTier as (typeof serviceTiers)[number],
      );
      const reqTierIndex = serviceTiers.indexOf(tier as (typeof serviceTiers)[number]);

      const tierOk =
        selectedTierIndex >= 0 && reqTierIndex >= 0
          ? selectedTierIndex >= reqTierIndex
          : selectedTier === tier;
      const keywordsOk = reqKeywords.every((kw) =>
        sCtx.selectedServiceKeywords.includes(kw),
      );

      value = tierOk && keywordsOk;
      break;
    }
    case "gameData": {
      const { data, gameDataId } = req.requirement;
      const rep = (JSON.parse(data) as { double?: number }).double ?? 0;
      value = (sCtx.factionReputation[gameDataId] ?? 0) >= rep;
      break;
    }
    case "skillLevel":
      value = (sCtx.skillLevels[req.requirement.skill] ?? 0) >= req.requirement.level;
      break;
    case "activityType": {
      const { activity: reqActivity, keywords: reqKeywords } = req.requirement;
      value =
        (!reqActivity || sCtx.activityId === reqActivity) &&
        (!reqKeywords?.length ||
          reqKeywords.every((kw) => sCtx.activityKeywords.includes(kw)));
      break;
    }
    case "totalSkillLevel":
      value =
        Object.values(sCtx.skillLevels).reduce((a, b) => a + b, 0) >=
        req.requirement.levels;
      break;
    case "totalSkillLevelUps":
      value =
        Object.values(sCtx.skillLevels).reduce((a, b) => a + b - 1, 0) >=
        req.requirement.levels;
      break;
    case "itemAnywhereWithYou":
    case "itemAnywhere":
      value = sCtx.ownedItemIds.includes(req.requirement.item);
      break;
    case "keywordEquipped":
      value = dCtx.equippedGear.some((g) => g.keywords?.includes(req.requirement.keyword));
      break;
    case "keywordWithLevelEquipped": {
      const { keyword, skill, level } = req.requirement;
      value = dCtx.equippedGear.some((g) => {
        const kwCheck = g.keywords?.includes(keyword);
        const levelReqs = getLevelRequirementsMap(g.requirements);
        return kwCheck && skill in levelReqs && levelReqs[skill] >= level;
      });
      break;
    }
    case "itemEquipped":
      value = dCtx.equippedGear.some(({ id }) => id === req.requirement.item);
      break;
    case "abilityAvailable": {
      const { ability } = req.requirement;
      value = dCtx.equippedGear.some(({ abilities }) =>
        abilities?.flatMap((a) => (typeof a === "object" ? a.ability : a)).includes(ability),
      );
      break;
    }
    default:
      // Unknown / unhandled requirement types: assume met to be permissive.
      value = true;
  }

  return opposite ? !value : value;
}

/** Builds the per-call dynamic context from the current gear set. */
export function buildDynCtx(
  gearItems: WorkerItem[],
  location: LocationSummary | null,
  sCtx: StaticReqCtx,
): DynCtx {
  const equippedKeywordCounts: Record<string, number> = {};
  for (const item of gearItems) {
    for (const kw of item.keywords ?? []) {
      equippedKeywordCounts[kw] = (equippedKeywordCounts[kw] ?? 0) + 1;
    }
  }
  return {
    equippedKeywordCounts,
    equippedGear: gearItems,
    locationKeywords: location?.keywords ?? sCtx.locationKeywords,
    locationFaction: location?.faction ?? sCtx.locationFaction,
    locationSubFactions: location?.subFactions ?? sCtx.locationSubFactions,
  };
}

// ---------------------------------------------------------------------------
// Static entries
// ---------------------------------------------------------------------------

/**
 * Pre-filters the static entries (collectibles + level bonuses + service)
 * using a context with no equipped gear.  These entries' requirements don't
 * depend on the dynamic gear set, so they can be filtered once per job.
 */
export function preFilterStaticEntries(
  staticEntries: EffectiveAttrEntry[],
  sCtx: StaticReqCtx,
): EffectiveAttrEntry[] {
  const emptyDynCtx: DynCtx = {
    equippedKeywordCounts: {},
    equippedGear: [],
    locationKeywords: sCtx.locationKeywords,
    locationFaction: sCtx.locationFaction,
    locationSubFactions: sCtx.locationSubFactions,
  };
  return staticEntries.filter(
    (e) => requirementsMet(e.requirements, sCtx, emptyDynCtx),
  );
}

// ---------------------------------------------------------------------------
// Multi-slot filter (ring / tool deduplication)
// ---------------------------------------------------------------------------

export function filterMultislot(
  gearSet: WorkerGearSet,
  opts: WorkerItem[],
  slotKey: string,
  slotName: string,
  keywordsMap: Record<string, { bannedKeywords: string[] }>,
  lockedKeywords: string[] = [],
): WorkerItem[] {
  const previousSlots = Object.entries(gearSet)
    .filter(([slot]) => slot.includes(slotKey))
    .map(([, item]): number => {
      if (!item || !("score" in item)) return -1;
      const gearItem = item as WorkerItem;
      return opts.findIndex(
        (opt) => opt.id === gearItem.id && opt.quality === gearItem.quality,
      );
    });

  return opts.filter((item, index) => {
    if (previousSlots.includes(index)) return false;

    const otherSlotItems = Object.entries(gearSet)
      .filter(([slot, v]) => v && slot !== slotName && slot.includes(slotKey))
      .map(([, v]) => v as WorkerItem);

    const equippedKeywords = otherSlotItems
      .flatMap((si) => si.keywords ?? [])
      .concat(lockedKeywords);
    const bannedKeywords = equippedKeywords.flatMap(
      (kw) => keywordsMap[kw]?.bannedKeywords ?? [],
    );
    return !(item.keywords ?? []).some((kw) => bannedKeywords.includes(kw));
  });
}
