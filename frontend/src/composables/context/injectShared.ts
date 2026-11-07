import { inject, type InjectionKey } from "vue";
import type { BaseContext } from "./useBaseContext";
import {
  BaseContextKey,
  EffectiveAttrsKey,
  SkillModifiersKey,
  RequirementsKey,
  LootTablesKey,
  FineMaterialsKey,
  type SharedEffectiveAttrs,
  type SharedSkillModifiers,
  type SharedRequirements,
  type SharedLootTables,
  type SharedFineMaterials,
} from "./injectionKeys";

// Re-export types for consumer convenience
export type {
  BaseContext,
  SharedEffectiveAttrs,
  SharedSkillModifiers,
  SharedRequirements,
  SharedLootTables,
  SharedFineMaterials,
};

// ---------------------------------------------------------------------------
// Inject helpers
// ---------------------------------------------------------------------------

function strictInject<T>(key: InjectionKey<T>, name: string): T {
  const value = inject(key);
  if (!value) {
    throw new Error(
      `[${name}] not provided. Ensure provideSharedComposables() is called in a parent component.`,
    );
  }
  return value;
}

/** Inject the shared BaseContext (store-backed computed refs). */
export function injectBaseContext(): BaseContext {
  return strictInject(BaseContextKey, "BaseContext");
}

/** Inject the shared effective attribute computations. */
export function injectEffectiveAttrs(): SharedEffectiveAttrs {
  return strictInject(EffectiveAttrsKey, "EffectiveAttrs");
}

/** Inject the shared skill modifier computations. */
export function injectSkillModifiers(): SharedSkillModifiers {
  return strictInject(SkillModifiersKey, "SkillModifiers");
}

/** Inject the shared requirement-checking functions. */
export function injectRequirements(): SharedRequirements {
  return strictInject(RequirementsKey, "Requirements");
}

/** Inject the shared loot-table computations. */
export function injectLootTables(): SharedLootTables {
  return strictInject(LootTablesKey, "LootTables");
}

/** Inject the shared fine-materials computations. */
export function injectFineMaterials(): SharedFineMaterials {
  return strictInject(FineMaterialsKey, "FineMaterials");
}
