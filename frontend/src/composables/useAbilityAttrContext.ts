import { computed, type ComputedRef } from "vue";
import { useDataStore } from "@/store/data";
import { useAbilityToggleStore } from "@/store/abilityToggles";
import {
  abilityAttributes,
  type AbilityAttrContext,
} from "@/domain/abilities/petAbilityAttrs";
import {
  buildCompleteActionsAbility,
  type CompleteActionsAbility,
} from "@/domain/abilities/completeActions";

/**
 * Assembles the plain `AbilityAttrContext` consumed by the pure
 * `petAbilityAttrEntries` helper. This is the one place allowed to read the
 * data/toggle stores; the resulting object carries no reactivity of its own.
 *
 * Reads:
 * - `abilitiesMap`         -> ability summaries (name/icon/type) for labelling
 * - `detailedAbilitiesMap` -> the (lazily fetched) ability attributes and
 *                             complete-actions specs
 * - `abilityToggleStore`   -> active abilities toggled off (enabled by default)
 */
export function buildAbilityAttrContext(): AbilityAttrContext {
  const dataStore = useDataStore();
  const toggleStore = useAbilityToggleStore();

  const attrsById: AbilityAttrContext["attrsById"] = {};
  const completeActionsById: Record<string, CompleteActionsAbility> = {};
  for (const [id, detail] of Object.entries(dataStore.detailedAbilitiesMap)) {
    attrsById[id] = abilityAttributes(detail);
    const completeActions = buildCompleteActionsAbility(detail);
    if (completeActions) completeActionsById[id] = completeActions;
  }

  return {
    attrsById,
    summaryById: dataStore.abilitiesMap,
    disabledActiveAbilityIds: toggleStore.disabledIds,
    completeActionsById,
  };
}

/** Reactive wrapper for the display path. */
export function useAbilityAttrContext(): ComputedRef<AbilityAttrContext> {
  return computed(() => buildAbilityAttrContext());
}
