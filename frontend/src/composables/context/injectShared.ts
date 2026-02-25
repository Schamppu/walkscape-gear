import { inject } from "vue";
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

function strictInject<T>(key: symbol, name: string): T {
  const value = inject<T>(key as any);
  if (!value) {
    throw new Error(
      `[${name}] not provided. Ensure provideSharedComposables() is called in a parent component.`,
    );
  }
  return value;
}

/** Inject the shared BaseContext (store-backed computed refs). */
export function injectBaseContext(): BaseContext {
  return strictInject<BaseContext>(BaseContextKey as any, "BaseContext");
}

/** Inject the shared effective attribute computations. */
export function injectEffectiveAttrs(): SharedEffectiveAttrs {
  return strictInject<SharedEffectiveAttrs>(
    EffectiveAttrsKey as any,
    "EffectiveAttrs",
  );
}

/** Inject the shared skill modifier computations. */
export function injectSkillModifiers(): SharedSkillModifiers {
  return strictInject<SharedSkillModifiers>(
    SkillModifiersKey as any,
    "SkillModifiers",
  );
}

/** Inject the shared requirement-checking functions. */
export function injectRequirements(): SharedRequirements {
  return strictInject<SharedRequirements>(
    RequirementsKey as any,
    "Requirements",
  );
}

/** Inject the shared loot-table computations. */
export function injectLootTables(): SharedLootTables {
  return strictInject<SharedLootTables>(LootTablesKey as any, "LootTables");
}

/** Inject the shared fine-materials computations. */
export function injectFineMaterials(): SharedFineMaterials {
  return strictInject<SharedFineMaterials>(
    FineMaterialsKey as any,
    "FineMaterials",
  );
}
