/**
 * Purpose:
 * Web Worker that runs the CPU-intensive gear optimiser beam-search phases
 * (gearFill + fallbackFill) off the main thread so the UI stays responsive.
 *
 * Does NOT:
 * - Import Vue / reactive APIs.
 * - Access Pinia stores.
 * - Contain any option-generation logic (that stays on the main thread).
 */

import { calculateStatTotals } from "@/domain/effectiveAttrs";
import { calculateSkillModifiers } from "@/domain/skillModifiers";
import {
  compareScore as _compareScore,
  startScore as _startScore,
} from "@/domain/optimiser/scoring";
import { slotMax } from "@/domain/constants/gear";
import { serviceTiers } from "@/domain/constants/services";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { SkillModifiersResult } from "@/domain/skillModifiers";
import type { Requirement } from "@/domain/types/common";
import type { LocationSummary } from "@/domain/types/location";
import type {
  OptimiserJobData,
  OptimiserJobResult,
  StaticReqCtx,
  WorkerCandidate,
  WorkerGearSet,
  WorkerItem,
} from "./optimiserWorkerTypes";

// ---------------------------------------------------------------------------
// Requirement checking (pure, no Vue / Pinia)
// ---------------------------------------------------------------------------

type DynCtx = {
  equippedKeywordCounts: Record<string, number>;
  equippedGear: WorkerItem[];
  locationKeywords: string[];
  locationFaction: string | null;
  locationSubFactions: string[];
};

function requirementsMet(
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
function buildDynCtx(
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
// Scoring
// ---------------------------------------------------------------------------

function extractScore(result: SkillModifiersResult, prio: string): number {
  if (prio === "stepsPerRewardRoll") return result.stepsPerRewardRoll;
  if (prio === "balanced") {
    const xpValue = result.xpPerStep[result.xpPerStep.length - 1]?.value ?? 1;
    return result.stepsPerRewardRoll / Math.sqrt(xpValue > 0 ? xpValue : 1);
  }
  if (prio === "xpPerStep") return result.xpPerStep[result.xpPerStep.length - 1]?.value ?? 0;
  if (prio === "craftsPerMaterial") return result.craftsPerMaterial;
  if (prio === "balancedRecipe") {
    const xpValue = result.xpPerStep[result.xpPerStep.length - 1]?.value ?? 1;
    return result.craftsPerMaterial * (xpValue > 0 ? xpValue : 1);
  }
  if (prio === "stepsPerFineRoll") return result.stepsPerFineRoll;
  if (prio === "stepsPerCollectibleRoll") return result.stepsPerCollectibleRoll;
  return result.stepsPerRewardRoll;
}

/**
 * Gear items are `WorkerItem | LocationSummary | null | undefined`.
 * Only `WorkerItem` values (which have `score`) contribute to stat totals.
 */
function extractGearItems(set: WorkerGearSet): WorkerItem[] {
  return Object.values(set).filter(
    (v): v is WorkerItem => v != null && "score" in v,
  );
}

function scoreGearSet(
  set: WorkerGearSet,
  data: OptimiserJobData,
  preFilteredStatic: EffectiveAttrEntry[],
): number {
  const location = (set.location as LocationSummary | null | undefined) ?? null;
  const gearItems = extractGearItems(set);
  const dCtx = buildDynCtx(gearItems, location, data.reqCtx);

  const gearEntries = gearItems.flatMap((item) =>
    item._attrEntries.filter(
      (e) => requirementsMet(e.requirements, data.reqCtx, dCtx),
    ),
  );

  const totals = calculateStatTotals([...preFilteredStatic, ...gearEntries]);
  const result = calculateSkillModifiers(totals, data.source, data.activitySelected);
  return extractScore(result, data.prio);
}

/**
 * Pre-filters the static entries (collectibles + level bonuses + service)
 * using a context with no equipped gear.  These entries' requirements don't
 * depend on the dynamic gear set, so they can be filtered once per job.
 */
function preFilterStaticEntries(
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

function filterMultislot(
  gearSet: WorkerGearSet,
  opts: WorkerItem[],
  slotKey: string,
  slotName: string,
  keywordsMap: Record<string, { bannedKeywords: string[] }>,
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

    const equippedKeywords = otherSlotItems.flatMap((si) => si.keywords ?? []);
    const bannedKeywords = equippedKeywords.flatMap(
      (kw) => keywordsMap[kw]?.bannedKeywords ?? [],
    );
    return !(item.keywords ?? []).some((kw) => bannedKeywords.includes(kw));
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const compareScore = (a: number, b: number, prio: string): number =>
  _compareScore(a, b, prio);

const startScore = (prio: string): number => _startScore(prio);

// ---------------------------------------------------------------------------
// Beam search
// ---------------------------------------------------------------------------

function beamSearch(
  baseCandidate: WorkerCandidate,
  slots: string[],
  gearOptions: Record<string, (WorkerItem | LocationSummary)[]>,
  score: (set: WorkerGearSet) => number,
  prio: string,
  keywordsMap: Record<string, { bannedKeywords: string[] }>,
): WorkerCandidate[] {
  const BEAM_WIDTH = 3;
  let candidates: WorkerCandidate[] = [baseCandidate];

  for (const slotName of slots) {
    if (baseCandidate.gearSet[slotName]) continue;

    const slotKey = slotName.replace(/\d+$/, "");
    const options = (gearOptions[slotKey] ?? []) as WorkerItem[];
    if (!options.length) continue;

    const next: WorkerCandidate[] = [];

    for (const { gearSet, slotCounts } of candidates) {
      const filteredOptions =
        slotKey === "ring" || slotKey === "tool"
          ? filterMultislot(gearSet, options, slotKey, slotName, keywordsMap)
          : options;

      for (const item of filteredOptions) {
        const newSet: WorkerGearSet = { ...gearSet, [slotName]: item };
        const newScore = score(newSet);
        const prevCount = slotCounts[slotKey] ?? 0;

        next.push({
          gearSet: newSet,
          score: newScore,
          slotCounts: { ...slotCounts, [slotKey]: prevCount + 1 },
        });
      }
    }

    candidates = [...candidates, ...next]
      .sort((a, b) => compareScore(b.score, a.score, prio))
      .slice(0, BEAM_WIDTH);
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Gear fill (primary beam search phase)
// ---------------------------------------------------------------------------

function gearFill(
  data: OptimiserJobData,
  score: (set: WorkerGearSet) => number,
): WorkerCandidate[] {
  const { reqSets, gearOptions, activeSlots, playerLevel, prio, keywordsMap } = data;

  let candidates: WorkerCandidate[] = reqSets.length
    ? reqSets
    : [{ gearSet: {}, score: startScore(prio), slotCounts: {} }];

  const locationOptions = (gearOptions.primary["location"] ?? [null]) as (LocationSummary | null)[];

  locationOptions.forEach((location) => {
    candidates.forEach((candidate) => {
      const remainingPrimary = Object.fromEntries(
        Object.entries(gearOptions.primary).filter(
          ([slot]) =>
            slot !== "location" &&
            !(
              slot in candidate.slotCounts &&
              candidate.slotCounts[slot] >= slotMax(slot, playerLevel)
            ),
        ),
      ) as Record<string, (WorkerItem | LocationSummary)[]>;

      const usedCandidate: WorkerCandidate = {
        ...candidate,
        gearSet: {
          ...candidate.gearSet,
          location: location ?? data.defaultLocation,
        },
      };

      const searchResult = beamSearch(usedCandidate, activeSlots, remainingPrimary, score, prio, keywordsMap);
      candidates = candidates.concat(searchResult);
    });
  });

  return candidates
    .sort((a, b) => compareScore(b.score, a.score, prio))
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Fallback fill
// ---------------------------------------------------------------------------

function fallbackFill(
  data: OptimiserJobData,
  baseCandidates: WorkerCandidate[],
  score: (set: WorkerGearSet) => number,
): WorkerCandidate[] {
  const { gearOptions, activeSlots, keywordsMap, prio } = data;

  return baseCandidates.map((candidate) => {
    let { gearSet, slotCounts } = candidate;

    for (const slotName of activeSlots) {
      if (gearSet[slotName]) continue;

      const slotKey = slotName.replace(/\d+$/, "");
      const fallbackItems = (gearOptions.fallback[slotKey] ?? []) as WorkerItem[];
      if (!fallbackItems.length) continue;

      const filteredItems =
        slotKey === "ring" || slotKey === "tool"
          ? filterMultislot(gearSet, fallbackItems, slotKey, slotName, keywordsMap)
          : fallbackItems;

      if (!filteredItems.length) continue;

      const prevCount = slotCounts[slotKey] ?? 0;
      const best = filteredItems.reduce<{ item: WorkerItem; s: number } | null>(
        (acc, item) => {
          const s = score({ ...gearSet, [slotName]: item });
          if (!acc || compareScore(s, acc.s, prio) > 0) return { item, s };
          return acc;
        },
        null,
      );

      if (!best) continue;

      gearSet = { ...gearSet, [slotName]: best.item };
      slotCounts = { ...slotCounts, [slotKey]: prevCount + 1 };
    }

    return {
      ...candidate,
      gearSet,
      score: score(gearSet),
      slotCounts,
    };
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

self.onmessage = (e: MessageEvent<OptimiserJobData>) => {
  const data = e.data;

  const preFilteredStatic = preFilterStaticEntries(data.staticEntries, data.reqCtx);
  const score = (set: WorkerGearSet) => scoreGearSet(set, data, preFilteredStatic);

  const primarySets = gearFill(data, score);
  const fallbackSets = fallbackFill(data, primarySets, score);

  const [best] = fallbackSets.sort((a, b) => compareScore(b.score, a.score, data.prio));

  self.postMessage({
    gearSet: best?.gearSet ?? {},
    score: best?.score ?? 0,
  } satisfies OptimiserJobResult);
};
