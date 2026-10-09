import type {
  AdvancedOptimiserConfig,
  Target,
  XValue,
  YValue,
} from "@/domain/advancedOptimiser/config";
import type {
  DropProfile,
  ExtractionContext,
  TargetContext,
} from "@/domain/advancedOptimiser/targets";
import type { SkillModifiersResult } from "@/domain/skillModifiers";
import type { EffectiveAttrEntry, StatTotals } from "@/domain/effectiveAttrs";
import type { Stat } from "@/domain/types/item";
import type { Requirement } from "@/domain/types/common";
import type { LocationSummary } from "@/domain/types/location";
import type { StaticReqCtx, WorkerItem } from "@/workers/optimiserWorkerTypes";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";

/** Builds a target row. */
export function makeTarget(x: XValue, y: YValue, weight = 1): Target {
  return { x, y, weight };
}

/** Builds a TargetContext for a plain activity with no special loot tables. */
export function makeTargetContext(overrides: Partial<TargetContext> = {}): TargetContext {
  return {
    isRecipe: false,
    producesCraftedItem: false,
    hasChests: false,
    hasCollectibles: false,
    hasFineMaterials: false,
    hasTokens: false,
    ...overrides,
  };
}

/** Builds a minimal valid single-activity config. */
export function makeConfig(
  overrides: Partial<AdvancedOptimiserConfig> = {},
): AdvancedOptimiserConfig {
  return {
    mode: { kind: "singleActivity", activityId: "fixture-activity" },
    targets: [makeTarget("xp", "step", 10)],
    combinationRule: "weightedSum",
    ...overrides,
  };
}

/**
 * Builds naked-gear modifiers for a 10-step fishing action worth 50 XP.
 * Derived step fields are NOT recomputed from overrides; pass them explicitly.
 */
export function makeSkillModifiers(
  overrides: Partial<SkillModifiersResult> = {},
): SkillModifiersResult {
  return {
    maxWorkEfficiency: 2,
    workEfficiency: 1,
    uncappedWorkEfficiency: 1,
    effectiveMaxWorkEfficiency: 2,
    findCollectibles: 1,
    findGems: 1,
    findBirdNests: 1,
    fineMaterialFind: 0.01,
    chestFind: 1,
    qualityOutcome: 0,
    doubleAction: 0,
    doubleRewards: 0,
    noMaterialsConsumed: 0,
    stepsRequiredFlat: 0,
    stepsRequiredPercent: 1,
    stepsPerAction: 10,
    uncappedStepsPerCompletion: 10,
    stepsPerCompletion: 10,
    stepsPerRewardRoll: 10,
    stepsPerFineRoll: 1000,
    stepsPerCollectibleRoll: 10,
    craftsPerMaterial: 1,
    xpRewards: [{ skill: "fishing", skillText: "fishing", base: 50, value: 50 }],
    xpPerStep: [{ skill: "fishing", skillText: "fishing", value: 5, displayedValue: 5 }],
    ...overrides,
  };
}

/** Builds a DropProfile with no chests or tokens. */
export function makeDropProfile(overrides: Partial<DropProfile> = {}): DropProfile {
  return {
    chestsPerRoll: 0,
    unscaledChestsPerRoll: 0,
    tokenBasePerRoll: 0,
    tokenFineBonusPerRoll: 0,
    ...overrides,
  };
}

/** Builds an ExtractionContext for a fishing activity with naked modifiers. */
export function makeExtractionContext(
  overrides: Partial<ExtractionContext> = {},
): ExtractionContext {
  return {
    modifiers: makeSkillModifiers(),
    activitySkills: ["fishing"],
    quality: null,
    drops: makeDropProfile(),
    ...overrides,
  };
}

/**
 * Builds StatTotals from `{ statType: { flat?, percent? } }` sums, e.g.
 * `makeStatTotals({ workEfficiency: { percent: 0.5 } })`.
 */
export function makeStatTotals(
  sums: Record<string, { flat?: number; percent?: number }>,
): StatTotals {
  const bucket = (sum = 0) => ({
    sum,
    positive: Math.max(sum, 0),
    negative: Math.min(sum, 0),
  });
  return Object.fromEntries(
    Object.entries(sums).map(([type, { flat, percent }]) => [
      type,
      { flat: bucket(flat), percent: bucket(percent) },
    ]),
  );
}

// ---------------------------------------------------------------------------
// Worker-level fixtures (gear sets, requirements, locations)
// ---------------------------------------------------------------------------

/** A stat on a fixture item: `type` is the StatTotals key (e.g. "workEfficiency"). */
export type FixtureStat = { type: string; value: number; isPercent?: boolean; skill?: string };

/** Static requirement context for a fishing activity with no location set. */
export function makeReqCtx(overrides: Partial<StaticReqCtx> = {}): StaticReqCtx {
  return {
    activityId: "fixture-activity",
    activityKeywords: [],
    activityRelatedSkills: ["fishing"],
    recipeRelatedSkills: [],
    isActivity: true,
    locationKeywords: [],
    locationFaction: null,
    locationSubFactions: [],
    segments: [],
    selectedServiceTier: null,
    selectedServiceKeywords: [],
    skillLevels: { fishing: 50 },
    skillsMap: { fishing: { type: "gathering" } },
    achievementPoints: 0,
    factionReputation: {},
    ownedItemIds: [],
    ...overrides,
  };
}

const makeStat = ({ type, value, isPercent = true, skill }: FixtureStat): Stat =>
  ({
    stat: type,
    name: type,
    type,
    isPercent,
    isNegative: value < 0,
    isMultiplicative: false,
    value,
    ...(skill ? { skill } : {}),
  }) as unknown as Stat;

/** One attribute entry; all its stats share `requirements`. */
export function makeAttrEntry(
  id: string,
  stats: FixtureStat[],
  requirements: Requirement[] = [],
): EffectiveAttrEntry {
  return {
    id,
    requirements,
    stats: stats.map(makeStat),
    customText: "",
    statText: "",
    skillText: "",
    item: { id, name: id, icon: "" },
  };
}

/**
 * Builds a WorkerItem. `stats` become one unconditional attribute entry;
 * `conditional` adds entries that only apply when their requirements are met.
 */
export function makeWorkerItem(
  id: string,
  stats: FixtureStat[] = [],
  options: {
    keywords?: string[];
    conditional?: { stats: FixtureStat[]; requirements: Requirement[] }[];
  } = {},
): WorkerItem {
  const entries = [
    ...(stats.length ? [makeAttrEntry(id, stats)] : []),
    ...(options.conditional ?? []).map((c, i) =>
      makeAttrEntry(`${id}-${i}`, c.stats, c.requirements),
    ),
  ];
  return {
    id,
    name: id,
    quality: "common",
    keywords: options.keywords ?? [],
    requirements: [],
    stats: entries.flatMap((e) => e.stats),
    usefulStats: entries.flatMap((e) => e.stats),
    score: 0,
    _attrEntries: entries,
  } as unknown as WorkerItem;
}

export function makeLocationSummary(
  id: string,
  faction = "jarvonia",
  keywords: string[] = [],
): LocationSummary {
  return { id, name: id, icon: "", faction, subFactions: [], keywords } as LocationSummary;
}

const req = <T extends Requirement["type"]>(
  type: T,
  requirement: Extract<Requirement, { type: T }>["requirement"],
  opposite = false,
): Requirement => ({ type, requirement, opposite, name: null }) as Requirement;

export const keywordEquippedReq = (keyword: string, opposite = false) =>
  req("keywordEquipped", { keyword }, opposite);

export const setBonusReq = (keyword: string, quantity: number) =>
  req("distinctKeywordItemsEquipped", { keywords: [keyword], quantity });

export const realmReq = (realm: string) => req("realm", { realm });

export const locationKeywordsReq = (keywords: string[]) =>
  req("locationHasKeywords", { keywords });

/**
 * Advanced optimiser job for a fishing activity: 100 work, max 100% work
 * efficiency bonus (×2), 50 XP. Targets `xp / step` (weight 1) by default.
 */
export function makeJob(overrides: Partial<AdvancedOptimiserJob> = {}): AdvancedOptimiserJob {
  return {
    mode: { kind: "singleActivity", activityId: "fixture-activity" },
    targets: [makeTarget("xp", "step", 1)],
    combinationRule: "weightedSum",
    staticEntries: [],
    source: { maxWorkEfficiency: 2, workRequired: 100, xpRewardsMap: { fishing: 50 } },
    activitySelected: true,
    extraction: { activitySkills: ["fishing"], quality: null, drops: makeDropProfile() },
    reqCtx: makeReqCtx(),
    activityRequirements: [],
    keywordsMap: {},
    options: {},
    locations: [],
    defaultLocation: null,
    searchSlots: [],
    lockedItems: {},
    requirementSeeds: [],
    ...overrides,
  };
}

/** Deterministic random numbers in [0, 1) (mulberry32). */
export function seededRandom(seed = 1): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A clock that advances `step` ms every time it is read. */
export function tickingClock(step = 1): () => number {
  let t = 0;
  return () => (t += step);
}
