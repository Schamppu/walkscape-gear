import type { InjectionKey, ComputedRef } from "vue";
import type { BaseContext } from "./useBaseContext";
import type { EffectiveAttrEntry, StatTotals } from "@/domain/effectiveAttrs";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type {
  DetailedContextLootTable,
  MappedTableRow,
} from "@/domain/types/lootTable";
import type { RequirementContext, RequirementDisplay } from "@/composables/useRequirements";
import type { Requirement } from "@/domain/types/common";
import type { XpReward, XpPerStep } from "@/domain/skillModifiers";

// ---------------------------------------------------------------------------
// Shared return types (mirrors composable return types without importing them)
// ---------------------------------------------------------------------------

export type SharedEffectiveAttrs = {
  allAttrs: ComputedRef<EffectiveAttrEntry[]>;
  effectiveAttrs: ComputedRef<EffectiveAttrEntry[]>;
  totalsByStat: ComputedRef<StatTotals>;
};

export type SharedSkillModifiers = {
  maxWorkEfficiency: ComputedRef<number>;
  workEfficiency: ComputedRef<number>;
  uncappedWorkEfficiency: ComputedRef<number>;
  effectiveMaxWorkEfficiency: ComputedRef<number>;
  findCollectibles: ComputedRef<number>;
  findGems: ComputedRef<number>;
  findBirdNests: ComputedRef<number>;
  fineMaterialFind: ComputedRef<number>;
  chestFind: ComputedRef<number>;
  qualityOutcome: ComputedRef<number>;
  doubleAction: ComputedRef<number>;
  doubleRewards: ComputedRef<number>;
  noMaterialsConsumed: ComputedRef<number>;
  stepsRequiredFlat: ComputedRef<number>;
  stepsRequiredPercent: ComputedRef<number>;
  stepsPerAction: ComputedRef<number>;
  uncappedStepsPerCompletion: ComputedRef<number>;
  stepsPerCompletion: ComputedRef<number>;
  stepsPerRewardRoll: ComputedRef<number>;
  stepsPerFineRoll: ComputedRef<number>;
  stepsPerCollectibleRoll: ComputedRef<number>;
  craftsPerMaterial: ComputedRef<number>;
  xpRewards: ComputedRef<XpReward[]>;
  xpPerStep: ComputedRef<XpPerStep[]>;
};

export type SharedRequirements = {
  checkRequirement: (req: Requirement, context?: RequirementContext) => boolean;
  checkRequirements: (
    reqs: Requirement[] | null | undefined,
    context?: RequirementContext,
  ) => boolean;
  mapRequirementsText: (
    reqs: Requirement[],
    fulfilled?: boolean[],
  ) => RequirementDisplay[];
  mergeRequirements: typeof import("@/domain/requirements/requirementUtils").mergeRequirements;
  getLevelRequirementsMap: (
    reqs: Requirement[] | null | undefined,
  ) => Record<string, number>;
};

export type SharedLootTables = {
  lootTables: ComputedRef<unknown[]>;
  detailedLootTables: ComputedRef<DetailedContextLootTable[]>;
  filteredLootTables: ComputedRef<DetailedContextLootTable[]>;
  combinedItemDrops: ComputedRef<MappedTableRow[][]>;
  groupedLootTables: ComputedRef<DetailedContextLootTable[]>;
  dropItemInfoMap: ComputedRef<Record<string, DropItemInfo>>;
  groupSourcesByStat: (
    sources: MappedTableRow[],
  ) => Record<string, MappedTableRow[]>;
  hasCollectibleDrops: ComputedRef<boolean>;
  hasFineDrops: ComputedRef<boolean>;
};

export type SharedFineMaterials = {
  canUseFineMaterials: ComputedRef<boolean>;
  xpRewardsMultiplier: ComputedRef<number>;
  useFine: ComputedRef<boolean>;
};

// ---------------------------------------------------------------------------
// Injection Keys
// ---------------------------------------------------------------------------

export const BaseContextKey: InjectionKey<BaseContext> =
  Symbol("BaseContext");

export const EffectiveAttrsKey: InjectionKey<SharedEffectiveAttrs> =
  Symbol("EffectiveAttrs");

export const SkillModifiersKey: InjectionKey<SharedSkillModifiers> =
  Symbol("SkillModifiers");

export const RequirementsKey: InjectionKey<SharedRequirements> =
  Symbol("Requirements");

export const LootTablesKey: InjectionKey<SharedLootTables> =
  Symbol("LootTables");

export const FineMaterialsKey: InjectionKey<SharedFineMaterials> =
  Symbol("FineMaterials");
