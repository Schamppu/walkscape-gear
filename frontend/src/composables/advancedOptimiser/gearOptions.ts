import { getCandidateItems } from "@/composables/optimiser/gear";
import { enrichItems } from "@/composables/optimiser/stats";
import { hasUsefulStat } from "@/domain/advancedOptimiser/pruning";
import type { AbilityAttrContext } from "@/domain/abilities/petAbilityAttrs";
import type { WorkerItem } from "@/workers/optimiserWorkerTypes";

/**
 * Item options per slot type for the advanced optimiser: every usable item
 * (see `getCandidateItems`) with at least one helpful stat among `useful`,
 * enriched with its attribute entries for the worker.
 *
 * Must be called while Pinia is active (reads the item and gear stores).
 */
export const getAdvancedGearOptions = (
  slotKeys: readonly string[],
  useful: ReadonlySet<string>,
  abilityCtx: AbilityAttrContext,
): Record<string, WorkerItem[]> =>
  Object.fromEntries(
    Object.entries(getCandidateItems(slotKeys)).map(([slot, items]) => [
      slot,
      enrichItems(items, abilityCtx).filter((item) => hasUsefulStat(item, useful)),
    ]),
  );
