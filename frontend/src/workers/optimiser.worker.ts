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
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import {
  compareScore as _compareScore,
  startScore as _startScore,
} from "@/domain/optimiser/scoring";
import { slotMax } from "@/domain/constants/gear";
import {
  buildDynCtx,
  filterMultislot,
  preFilterStaticEntries,
  requirementsMet,
} from "@/domain/optimiser/setRequirements";
import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { SkillModifiersResult } from "@/domain/skillModifiers";
import type { LocationSummary } from "@/domain/types/location";
import type {
  OptimiserJobData,
  OptimiserJobResult,
  WorkerCandidate,
  WorkerGearSet,
  WorkerItem,
} from "./optimiserWorkerTypes";

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function extractScore(
  result: SkillModifiersResult,
  prio: string,
  recipeQualityContext: OptimiserJobData["recipeQualityContext"],
): number {
  if (prio === "stepsPerRewardRoll") return result.stepsPerRewardRoll;
  if (prio === "balanced") {
    const xpValue = result.xpPerStep[result.xpPerStep.length - 1]?.value ?? 1;
    return result.stepsPerRewardRoll / Math.sqrt(xpValue > 0 ? xpValue : 1);
  }
  if (prio === "xpPerStep") return result.xpPerStep[result.xpPerStep.length - 1]?.value ?? 0;
  if (prio === "craftsPerMaterial") return result.craftsPerMaterial;
  if (prio === "averageEternalCrafts") {
    if (!recipeQualityContext) return Infinity;
    const odds = getOutcomeOdds(
      recipeQualityContext.levelReq,
      result.qualityOutcome,
      recipeQualityContext.fineMode,
      result.craftsPerMaterial,
    );
    return odds[odds.length - 1]?.materialsNeeded ?? Infinity;
  }
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
  return extractScore(result, data.prio, data.recipeQualityContext);
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
  lockedMultislotKeywords: Record<string, string[]>,
): WorkerCandidate[] {
  const BEAM_WIDTH = 3;
  let candidates: WorkerCandidate[] = [baseCandidate];

  const orderedSlots = slots
    .map((slotName, originalIndex) => {
      if (baseCandidate.gearSet[slotName]) return null;

      const slotKey = slotName.replace(/\d+$/, "");
      const options = (gearOptions[slotKey] ?? []) as WorkerItem[];

      return {
        slotName,
        originalIndex,
        optionsCount: options.length,
      };
    })
    .filter(
      (entry): entry is { slotName: string; originalIndex: number; optionsCount: number } =>
        entry !== null,
    )
    .sort((a, b) => a.optionsCount - b.optionsCount || a.originalIndex - b.originalIndex)
    .map(({ slotName }) => slotName);

  for (const slotName of orderedSlots) {

    const slotKey = slotName.replace(/\d+$/, "");
    const options = (gearOptions[slotKey] ?? []) as WorkerItem[];
    if (!options.length) continue;

    const next: WorkerCandidate[] = [];

    for (const { gearSet, slotCounts } of candidates) {
      const filteredOptions =
        slotKey === "ring" || slotKey === "tool"
          ? filterMultislot(
              gearSet,
              options,
              slotKey,
              slotName,
              keywordsMap,
              lockedMultislotKeywords[slotKey] ?? [],
            )
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
  const {
    reqSets,
    gearOptions,
    activeSlots,
    playerLevel,
    prio,
    keywordsMap,
    lockedMultislotKeywords,
  } = data;

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

      const searchResult = beamSearch(usedCandidate, activeSlots, remainingPrimary, score, prio, keywordsMap, lockedMultislotKeywords);
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
  const { gearOptions, activeSlots, keywordsMap, prio, lockedMultislotKeywords } = data;

  return baseCandidates.map((candidate) => {
    let { gearSet, slotCounts } = candidate;

    for (const slotName of activeSlots) {
      if (gearSet[slotName]) continue;

      const slotKey = slotName.replace(/\d+$/, "");
      const fallbackItems = (gearOptions.fallback[slotKey] ?? []) as WorkerItem[];
      if (!fallbackItems.length) continue;

      const filteredItems =
        slotKey === "ring" || slotKey === "tool"
          ? filterMultislot(
              gearSet,
              fallbackItems,
              slotKey,
              slotName,
              keywordsMap,
              lockedMultislotKeywords[slotKey] ?? [],
            )
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
