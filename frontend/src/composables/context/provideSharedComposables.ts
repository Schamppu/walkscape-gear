import { provide } from "vue";
import useBaseContext from "./useBaseContext";
import { useEffectiveAttrs } from "../useEffectiveAttrs";
import { useSkillModifiers, type SkillModifiersContext } from "../useSkillModifiers";
import { useRequirements } from "../useRequirements";
import { useLootTables, type LootTablesContext } from "../useLootTables";
import { useFineMaterials } from "../useFineMaterialsCalculations";
import {
  BaseContextKey,
  EffectiveAttrsKey,
  SkillModifiersKey,
  RequirementsKey,
  LootTablesKey,
  FineMaterialsKey,
} from "./injectionKeys";

/**
 * Creates one shared instance of each base composable and provides them
 * via Vue's provide/inject mechanism. Call this once during the root
 * component's setup (App.vue) so that all descendant components can
 * `inject` the shared instances instead of creating their own.
 *
 * This avoids duplicated computed chains across the component tree,
 * significantly reducing reactive overhead.
 */
export function provideSharedComposables(): void {
  const ctx = useBaseContext();
  provide(BaseContextKey, ctx);

  const effectiveAttrs = useEffectiveAttrs(ctx);
  provide(EffectiveAttrsKey, effectiveAttrs);

  // BaseContext structurally satisfies these context types at runtime;
  // the narrow discriminated-union on `source` requires a cast.
  const skillModifiers = useSkillModifiers(ctx as unknown as SkillModifiersContext);
  provide(SkillModifiersKey, skillModifiers);

  const requirements = useRequirements(ctx);
  provide(RequirementsKey, requirements as any);

  const lootTables = useLootTables(ctx as unknown as LootTablesContext);
  provide(LootTablesKey, lootTables);

  const fineMaterials = useFineMaterials(ctx);
  provide(FineMaterialsKey, fineMaterials);
}
