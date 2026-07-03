import { computed, type ComputedRef } from "vue";
import { useDataStore } from "@/store/data";
import { useAbilityToggleStore } from "@/store/abilityToggles";
import {
  abilityAttributes,
  type AbilityAttrContext,
} from "@/domain/abilities/petAbilityAttrs";

/**
 * Assembles the plain `AbilityAttrContext` consumed by the pure
 * `petAbilityAttrEntries` helper. This is the one place allowed to read the
 * data/toggle stores; the resulting object carries no reactivity of its own.
 *
 * Reads:
 * - `abilitiesMap`         -> ability summaries (name/icon/type) for labelling
 * - `detailedAbilitiesMap` -> the (lazily fetched) ability attributes
 * - `abilityToggleStore`   -> active abilities toggled off (enabled by default)
 */
export function buildAbilityAttrContext(): AbilityAttrContext {
  const dataStore = useDataStore();
  const toggleStore = useAbilityToggleStore();

  const attrsById: AbilityAttrContext["attrsById"] = {};
  for (const [id, detail] of Object.entries(dataStore.detailedAbilitiesMap)) {
    attrsById[id] = abilityAttributes(detail);
  }

  return {
    attrsById,
    summaryById: dataStore.abilitiesMap,
    disabledActiveAbilityIds: toggleStore.disabledIds,
  };
}

/** Reactive wrapper for the display path. */
export function useAbilityAttrContext(): ComputedRef<AbilityAttrContext> {
  return computed(() => buildAbilityAttrContext());
}
