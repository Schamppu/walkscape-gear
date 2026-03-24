import { computed, type Ref } from "vue";
import { priorityValue } from "./priority";
import {
  useSkillModifiers,
  type SkillModifiersContext,
} from "@/composables/useSkillModifiers";
import useBaseContext from "@/composables/context/useBaseContext";
import { useRequirements, type RequirementContext } from "@/composables/useRequirements";
import { useLevelBonus, type LevelBonusContext } from "@/composables/useLevelBonus";
import { usePlayerStore } from "@/store/player";
import { useDataStore } from "@/store/data";
import { toDeepRaw } from "@/utils/rawData";
import {
  resolveItemAttrs,
  buildAllAttrEntries,
  calculateStatTotals,
} from "@/domain/effectiveAttrs";
import {
  calculateSkillModifiers,
  type SkillModifiersResult,
  type SkillModifiersSource,
} from "@/domain/skillModifiers";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import type { GearSet, OptimiserItem, GearOptions, Candidate } from "@/domain/optimiser/types";
import type { ItemDetail } from "@/domain/types/item";
import type { XpPerStep } from "@/domain/skillModifiers";
import type { ActivityDetail } from "@/domain/types/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import { useFineMaterials, type FineMaterialsContext } from "@/composables/useFineMaterialsCalculations";
import type {
  WorkerItem,
  WorkerGearOptions,
  OptimiserJobData,
  StaticReqCtx,
  WorkerCandidate,
} from "@/workers/optimiserWorkerTypes";

type RecipeQualityContext = {
  levelReq: number;
  useFineMaterials: boolean;
};

// ---------------------------------------------------------------------------
// Score extraction
// ---------------------------------------------------------------------------

const extractScore = (
  result: SkillModifiersResult,
  prio: string,
  recipeQualityContext: RecipeQualityContext | null = null,
): number => {
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
      recipeQualityContext.useFineMaterials,
      result.craftsPerMaterial,
    );
    return odds[odds.length - 1]?.materialsNeeded ?? Infinity;
  }
  if (prio === "balancedRecipe") {
    const xpValue = result.xpPerStep[result.xpPerStep.length - 1]?.value ?? 1;
    return result.craftsPerMaterial * (xpValue > 0 ? Math.sqrt(xpValue) : 1);
  }
  if (prio === "stepsPerFineRoll") return result.stepsPerFineRoll;
  if (prio === "stepsPerCollectibleRoll") return result.stepsPerCollectibleRoll;
  return result.stepsPerRewardRoll;
};

// ---------------------------------------------------------------------------
// Fast scorer factory
// ---------------------------------------------------------------------------

/** Shim to present a plain value as a Ref (read-only, sync-safe). */
const makeRef = <T>(value: T): Ref<T> => ({ value }) as Ref<T>;

/**
 * Builds a fast scorer for one optimise run.
 *
 * Calls all composables once and captures everything that stays constant for
 * the run (collectibles, level bonuses, service, source, prio).  The returned
 * closure only processes the variable gear set on each invocation, calling the
 * pure domain functions directly and avoiding Vue reactive overhead.
 */
const makeScorer = (): ((set: GearSet) => number) => {
  const baseCtx = useBaseContext();
  const { checkRequirements } = useRequirements(baseCtx as unknown as RequirementContext);
  const { workEfficiencyBonus, qualityOutcomeBonus } = useLevelBonus(
    baseCtx as unknown as LevelBonusContext,
  );

  const prio = priorityValue();
  const weBonus = workEfficiencyBonus.value;
  const qoBonus = qualityOutcomeBonus.value;
  const service = baseCtx.service.value;
  const source = baseCtx.source.value as SkillModifiersSource | null;
  const activitySelected = baseCtx.activitySelected.value;
  const recipeDetail = baseCtx.recipe.value as RecipeDetail | null;
  const { useFine } = useFineMaterials(baseCtx as unknown as FineMaterialsContext);
  const recipeLevelReq = (() => {
    if (activitySelected || !recipeDetail) return 0;
    const levelMap = getLevelRequirementsMap(recipeDetail.requirements);
    return Object.values(levelMap)[0] ?? 0;
  })();
  const recipeQualityContext: RecipeQualityContext | null = activitySelected
    ? null
    : {
        levelReq: recipeLevelReq,
        useFineMaterials: useFine.value,
      };

  // Resolve collectibles once — they don't change during a run.
  const collectibles = toDeepRaw(
    baseCtx.ownedItemsByCategory("collectibles") as ItemDetail[],
  );
  const staticEntries = buildAllAttrEntries(
    resolveItemAttrs(collectibles),
    weBonus,
    qoBonus,
    service,
  );

  return (set: GearSet): number => {
    const { location, ...items } = set;
    const gearItems = toDeepRaw(
      Object.values(items as Record<string, OptimiserItem | null | undefined>).filter(
        Boolean,
      ) as ItemDetail[],
    );

    // Only resolve the variable gear items; static entries are pre-built.
    const gearEntries = buildAllAttrEntries(resolveItemAttrs(gearItems), null, null, null);
    const allEntries = [...staticEntries, ...gearEntries];

    const reqCtx = {
      ...baseCtx,
      equippedGear: makeRef(gearItems),
      location: makeRef(location ?? baseCtx.location.value),
    } as unknown as RequirementContext;

    const effectiveEntries = allEntries.filter(({ requirements }) =>
      checkRequirements(requirements, reqCtx),
    );

    const totals = calculateStatTotals(effectiveEntries);
    const result = calculateSkillModifiers(totals, source, activitySelected);
    return extractScore(result, prio, recipeQualityContext);
  };
};

// ---------------------------------------------------------------------------
// Active scorer slot (one per concurrent optimise run)
// ---------------------------------------------------------------------------

let _activeScorer: ((set: GearSet) => number) | null = null;

/**
 * Installs a pre-computed scorer so that all `getGearSetStats` calls within
 * the same synchronous/async task use the fast path.  Returns a teardown
 * function that must be called when the run completes (or errors).
 *
 * @example
 * const uninstall = installScorer();
 * try { ... } finally { uninstall(); }
 */
export const installScorer = (): (() => void) => {
  _activeScorer = makeScorer();
  return () => {
    _activeScorer = null;
  };
};

// ---------------------------------------------------------------------------
// Worker job builder
// ---------------------------------------------------------------------------

/**
 * Pre-computes the `EffectiveAttrEntry[]` for a single item so the worker
 * scorer can skip `resolveItemAttrs` + `buildAllAttrEntries` per call.
 */
const enrichItem = (item: OptimiserItem): WorkerItem => {
  const raw = toDeepRaw(item as unknown as ItemDetail);
  return {
    ...(toDeepRaw(item as unknown as Record<string, unknown>) as OptimiserItem),
    _attrEntries: buildAllAttrEntries(resolveItemAttrs([raw]), null, null, null),
  };
};

const enrichItems = (items: OptimiserItem[]): WorkerItem[] => items.map(enrichItem);

const enrichCandidates = (candidates: Candidate[]): WorkerCandidate[] =>
  candidates.map((c) => ({
    ...c,
    gearSet: Object.fromEntries(
      Object.entries(c.gearSet).map(([slot, item]) => [
        slot,
        item && "score" in item ? enrichItem(item as OptimiserItem) : item,
      ]),
    ),
  }));

/**
 * Builds the serialisable `OptimiserJobData` to be posted to the optimiser
 * worker.  Must be called from a component/composable context (Pinia stores
 * are accessed here and nowhere in the worker).
 */
export const buildWorkerJob = (
  reqSets: Candidate[],
  primaryOptions: GearOptions,
  fallbackOptions: GearOptions,
  activeSlots: readonly string[],
): OptimiserJobData => {
  const baseCtx = useBaseContext();
  const playerStore = usePlayerStore();
  const dataStore = useDataStore();

  const { workEfficiencyBonus, qualityOutcomeBonus } = useLevelBonus(
    baseCtx as unknown as LevelBonusContext,
  );

  const source = baseCtx.source.value as SkillModifiersSource | null;
  const activitySelected = baseCtx.activitySelected.value;
  const { useFine } = useFineMaterials(baseCtx as unknown as FineMaterialsContext);
  const prio = priorityValue();

  // Static entries: collectibles + level bonuses + service (same as makeScorer).
  const collectibles = toDeepRaw(
    baseCtx.ownedItemsByCategory("collectibles") as ItemDetail[],
  );
  const staticEntries = buildAllAttrEntries(
    resolveItemAttrs(collectibles),
    workEfficiencyBonus.value,
    qualityOutcomeBonus.value,
    baseCtx.service.value,
  );

  // Static requirement context: snapshot of all store data checkRequirements needs.
  const activitySource = baseCtx.source.value;
  const activityDetail = baseCtx.activity.value as ActivityDetail | null;
  const recipeDetail = baseCtx.recipe.value as RecipeDetail | null;
  const recipeLevelReq = recipeDetail
    ? Object.values(getLevelRequirementsMap(recipeDetail.requirements))[0] ?? 1
    : 1;
  const recipeQualityContext: RecipeQualityContext | null = activitySelected
    ? null
    : {
        levelReq: recipeLevelReq,
        useFineMaterials: useFine.value,
      };
  const location = baseCtx.location.value;

  const reqCtx: StaticReqCtx = {
    activityId: activitySource?.id ?? null,
    activityKeywords: activitySource?.keywords ?? [],
    activityRelatedSkills:
      activityDetail?.relatedSkillsList ?? recipeDetail?.relatedSkills ?? [],
    recipeRelatedSkills: recipeDetail?.relatedSkills ?? [],
    isActivity: activitySelected,
    locationKeywords: location?.keywords ?? [],
    locationFaction: location?.faction ?? null,
    locationSubFactions: location?.subFactions ?? [],
    segments: baseCtx.segments.value.map((s) => ({
      keywords: s.from.keywords,
      faction: s.from.faction,
      subFactions: s.from.subFactions,
    })),
    selectedServiceTier: baseCtx.service.value?.tier ?? null,
    selectedServiceKeywords: baseCtx.service.value?.keywords ?? [],
    skillLevels: { ...playerStore.skillLevels },
    skillsMap: Object.fromEntries(
      Object.entries(playerStore.skillsMap).map(([k, v]) => [k, { type: v.type }]),
    ),
    achievementPoints: baseCtx.achievementPoints.value,
    factionReputation: { ...(baseCtx.factionReputation.value ?? {}) },
    ownedItemIds: Object.keys(baseCtx.ownedItems.value),
  };

  // Build enriched worker gear options.
  const workerGearOptions: WorkerGearOptions = {
    required: Object.fromEntries(
      Object.entries(primaryOptions).map(([slot, opts]) => [
        slot,
        enrichItems(opts.required),
      ]),
    ),
    primary: Object.fromEntries(
      Object.entries(primaryOptions).map(([slot, opts]) => [
        slot,
        slot === "location"
          ? (opts.primary as import("@/domain/types/location").LocationSummary[]) // LocationSummary[] — already serialisable
          : enrichItems(opts.primary as OptimiserItem[]),
      ]),
    ),
    fallback: Object.fromEntries(
      Object.entries(fallbackOptions).map(([slot, opts]) => [
        slot,
        enrichItems(opts.fallback),
      ]),
    ),
  };

  return toDeepRaw({
    staticEntries,
    source,
    activitySelected,
    recipeQualityContext,
    prio,
    defaultLocation: location,
    reqCtx,
    reqSets: enrichCandidates(reqSets),
    gearOptions: workerGearOptions,
    activeSlots: [...activeSlots],
    playerLevel: playerStore.level,
    keywordsMap: dataStore.keywordsMap,
  }) as OptimiserJobData;
};

// ---------------------------------------------------------------------------
// Public scoring function
// ---------------------------------------------------------------------------

export const getGearSetStats = (set: GearSet): number => {
  // Fast path: scorer is active for the current optimise run.
  if (_activeScorer) return _activeScorer(set);

  // Fallback: full reactive path used outside an optimise run (e.g. displaying
  // the current gear set's stats in the UI).
  const baseCtx = useBaseContext();

  const { location, ...items } = set;

  const gearCtx = {
    ...baseCtx,
    location: computed(() => (location ? location : baseCtx.location.value)),
    equippedGear: computed(
      () =>
        Object.values(
          items as Record<string, OptimiserItem | null | undefined>,
        ).filter(Boolean) as OptimiserItem[],
    ),
  } as unknown as SkillModifiersContext;

  const stats = useSkillModifiers(gearCtx);
  const prio = priorityValue();
  const { useFine } = useFineMaterials(baseCtx as unknown as FineMaterialsContext);
  const recipeDetail = baseCtx.recipe.value as RecipeDetail | null;
  const recipeLevelReq = recipeDetail
    ? Object.values(getLevelRequirementsMap(recipeDetail.requirements))[0] ?? 1
    : 1;
  const recipeQualityContext: RecipeQualityContext | null = baseCtx.activitySelected.value
    ? null
    : {
        levelReq: recipeLevelReq,
        useFineMaterials: useFine.value,
      };

  if (prio === "stepsPerRewardRoll") return stats.stepsPerRewardRoll.value;
  if (prio === "balanced") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    const xpValue = xp[xp.length - 1]?.value ?? 1;
    return stats.stepsPerRewardRoll.value / Math.sqrt(xpValue > 0 ? xpValue : 1);
  }
  if (prio === "xpPerStep") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    return xp[xp.length - 1].value;
  }
  if (prio === "craftsPerMaterial") return stats.craftsPerMaterial.value;
  if (prio === "averageEternalCrafts") {
    if (!recipeQualityContext) return Infinity;
    const odds = getOutcomeOdds(
      recipeQualityContext.levelReq,
      stats.qualityOutcome.value,
      recipeQualityContext.useFineMaterials,
      stats.craftsPerMaterial.value,
    );
    return odds[odds.length - 1]?.materialsNeeded ?? Infinity;
  }
  if (prio === "balancedRecipe") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    const xpValue = xp[xp.length - 1]?.value ?? 1;
    return stats.craftsPerMaterial.value * (xpValue > 0 ? xpValue : 1);
  }
  if (prio === "stepsPerFineRoll") return stats.stepsPerFineRoll.value;
  if (prio === "stepsPerCollectibleRoll")
    return stats.stepsPerCollectibleRoll.value;

  // fallback
  return stats.stepsPerRewardRoll.value;
};
