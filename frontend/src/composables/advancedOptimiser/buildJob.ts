import useBaseContext from "@/composables/context/useBaseContext";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useGearStore } from "@/store/gear";
import { usePlayerStore } from "@/store/player";
import { getRequiredGearOptions } from "@/composables/optimiser/gear";
import {
  buildStaticEntries,
  buildStaticReqCtx,
  enrichCandidates,
  enrichItems,
} from "@/composables/optimiser/stats";
import { requirementsFill } from "@/composables/optimiser/requirementsFill";
import { buildAbilityAttrContext } from "@/composables/useAbilityAttrContext";
import { gearSlots, gearTypes, slotMax } from "@/domain/constants/gear";
import { filterLocations } from "@/domain/optimiser/gear";
import { isHandledRequirement } from "@/domain/optimiser/requirements";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import { slotKeyOf } from "@/domain/advancedOptimiser/beam";
import { unionUsefulStats } from "@/domain/advancedOptimiser/stats";
import type { AdvancedOptimiserConfig } from "@/domain/advancedOptimiser/config";
import type { FineMaterialsMode } from "@/domain/quality/qualityOutcomeOdds";
import type { SkillModifiersSource } from "@/domain/skillModifiers";
import type { OptimiserItem } from "@/domain/optimiser/types";
import type { Requirement, LootTableRef } from "@/domain/types/common";
import type { LocationSummary } from "@/domain/types/location";
import { toDeepRaw } from "@/utils/rawData";
import type { WorkerGearSet, WorkerItem } from "@/workers/optimiserWorkerTypes";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import { getAdvancedGearOptions } from "./gearOptions";
import { buildSourceDropProfile } from "./dropProfile";

/** Fields of the selected activity / recipe the job builder reads. */
type JobSource = SkillModifiersSource & {
  id: string;
  name: string;
  requirements?: Requirement[] | null;
  tables?: LootTableRef[] | null;
};

export type BuildJobInputs = {
  config: AdvancedOptimiserConfig;
  /** The recipe's main reward is a crafted (quality-aware) item. */
  producesCraftedItem: boolean;
  fineMode: FineMaterialsMode;
};

/** Slot names the player can use: tool slots beyond the toolbelt size are dropped. */
const usableSlots = (playerLevel: number): string[] => {
  const toolbelt = slotMax("tool", playerLevel);
  return gearSlots.filter((slot) => {
    const tool = slot.match(/^tool(\d+)$/);
    return !tool || Number(tool[1]) <= toolbelt;
  });
};

/**
 * Builds the serialisable advanced optimiser job from the stores. Call it
 * while a quick-set scorer is installed (`installScorer`): the requirement
 * seeds come from the quick set's `requirementsFill`.
 *
 * Returns `null` when no activity or recipe is selected.
 */
export const buildAdvancedJob = ({
  config,
  producesCraftedItem,
  fineMode,
}: BuildJobInputs): AdvancedOptimiserJob | null => {
  const baseCtx = useBaseContext();
  const activityStore = useActivityStore();
  const dataStore = useDataStore();
  const gearStore = useGearStore();
  const playerStore = usePlayerStore();

  const source = baseCtx.source.value as JobSource | null;
  if (!source) return null;
  const activitySelected = baseCtx.activitySelected.value;
  const abilityCtx = buildAbilityAttrContext();

  // --- Slots and locks -------------------------------------------------------
  // Only slots holding an item type (not "service"), so applying the result
  // never writes to anything else.
  const optionTypes = new Set<string>(gearTypes.filter((t) => t !== "location"));
  const slots = usableSlots(playerStore.level).filter((slot) => optionTypes.has(slotKeyOf(slot)));
  const locked = new Set(slots.filter((slot) => gearStore.isSlotLocked(slot as never)));
  const searchSlots = slots.filter((slot) => !locked.has(slot));

  const lockedItems: Record<string, WorkerItem> = {};
  for (const slot of locked) {
    const item = gearStore.selectedGearset[slot as keyof typeof gearStore.selectedGearset];
    if (item) [lockedItems[slot]] = enrichItems([item as unknown as OptimiserItem], abilityCtx);
  }

  // --- Item options ----------------------------------------------------------
  const slotKeys = [...new Set(searchSlots.map(slotKeyOf))];
  const useful = new Set<string>(unionUsefulStats(config.targets));
  const usefulOptions = getAdvancedGearOptions(slotKeys, useful, abilityCtx);

  // --- Requirements ----------------------------------------------------------
  const requirements = (source.requirements ?? []).concat(
    (activityStore.service?.requirements ?? []) as Requirement[],
  );
  const requiredOptions = getRequiredGearOptions();

  // Items that fulfil the activity's requirements (e.g. any fishing rod) are
  // options too, even without useful stats, so the search can swap them.
  const options = Object.fromEntries(
    slotKeys.map((key) => {
      const items = [...(usefulOptions[key] ?? [])];
      const seen = new Set(items.map((i) => `${i.id}:${i.quality}`));
      for (const item of enrichItems(requiredOptions[key]?.required ?? [], abilityCtx)) {
        if (!seen.has(`${item.id}:${item.quality}`)) {
          seen.add(`${item.id}:${item.quality}`);
          items.push(item);
        }
      }
      return [key, items];
    }),
  );

  const requirementSeeds: WorkerGearSet[] = enrichCandidates(
    requirementsFill(requiredOptions, requirements),
    abilityCtx,
  )
    .map(({ gearSet }) =>
      Object.fromEntries(Object.entries(gearSet).filter(([slot]) => searchSlots.includes(slot))),
    )
    .filter((set) => Object.keys(set).length > 0);

  // --- Extraction inputs -----------------------------------------------------
  const xpMap = (activitySelected ? source.xpRewardsMap : source.xpRewards) ?? {};
  const levelReq = Object.values(getLevelRequirementsMap(source.requirements))[0] ?? 1;

  return toDeepRaw({
    mode: config.mode,
    targets: config.targets,
    combinationRule: config.combinationRule,
    staticEntries: buildStaticEntries(),
    source,
    activitySelected,
    extraction: {
      activitySkills: Object.keys(xpMap),
      quality: !activitySelected && producesCraftedItem ? { levelReq, fineMode } : null,
      drops: buildSourceDropProfile(source),
    },
    reqCtx: buildStaticReqCtx(),
    activityRequirements: requirements.filter(isHandledRequirement),
    keywordsMap: dataStore.keywordsMap,
    options,
    locations: (activityStore.locations
      ? filterLocations(activityStore.locations)
      : []) as unknown as LocationSummary[],
    defaultLocation: baseCtx.location.value as unknown as LocationSummary | null,
    searchSlots,
    lockedItems,
    requirementSeeds,
  }) as AdvancedOptimiserJob;
};
