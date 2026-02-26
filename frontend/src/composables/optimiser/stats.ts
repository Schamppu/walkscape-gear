import { computed, type Ref } from "vue";
import { priorityValue } from "./priority";
import {
  useSkillModifiers,
  type SkillModifiersContext,
} from "@/composables/useSkillModifiers";
import useBaseContext from "@/composables/context/useBaseContext";
import { useRequirements, type RequirementContext } from "@/composables/useRequirements";
import { useLevelBonus, type LevelBonusContext } from "@/composables/useLevelBonus";
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
import type { GearSet, OptimiserItem } from "@/domain/optimiser/types";
import type { ItemDetail } from "@/domain/types/item";
import type { XpPerStep } from "@/domain/skillModifiers";

// ---------------------------------------------------------------------------
// Score extraction
// ---------------------------------------------------------------------------

const extractScore = (result: SkillModifiersResult, prio: string): number => {
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
    return extractScore(result, prio);
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
