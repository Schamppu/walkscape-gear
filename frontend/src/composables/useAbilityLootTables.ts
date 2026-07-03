/**
 * Purpose:
 * Reactive composable resolving the loot tables that equipped abilities roll
 * via a `rollLootTable` action (e.g. "Present Rain", "Rock And Roll").
 *
 * A section is produced only for abilities that are usable in the current
 * context (their requirements pass). For actions-based cooldowns a steps figure
 * is derived (`stepsPerAction * cooldown.actions`); time-based cooldowns have no
 * steps, so drops show chance + amount per activation only.
 *
 * Mirrors the pattern of `useChestLootTables`.
 */

import { computed, watch, type ComputedRef } from "vue";
import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import {
  useRequirements,
  type RequirementContext,
} from "@/composables/useRequirements";
import {
  useSkillModifiers,
  type SkillModifiersContext,
} from "@/composables/useSkillModifiers";
import { collectEquippedAbilityIds } from "@/domain/abilities/equippedAbilities";
import {
  extractAbilityLootSpecs,
  abilityUsageRequirements,
  abilityStepsPerActivation,
} from "@/domain/abilities/abilityLootTables";
import { resolveLootTableWeights } from "@/domain/lootTables/lootTables";
import { deduplicateAndGroupDrops } from "@/domain/lootTables/contextTables";
import { buildDropItemInfoMap, type DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { EquippedItem } from "@/store/gear";
import type {
  DetailedContextLootTable,
  DetailedLootTable,
} from "@/domain/types/lootTable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AbilityLootTableInfo = {
  abilityId: string;
  name: string;
  icon: string;
  /** Roll amount of the ability's first loot spec (for the header label). */
  rollAmount: number;
  /** Steps between activations, or null for a time-based cooldown. */
  stepsPerActivation: number | null;
  dropInfoMap: Record<string, DropItemInfo>;
};

type Ctx = { equippedGear: ComputedRef<EquippedItem[]> };

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAbilityLootTables(
  ctx: Ctx,
): ComputedRef<AbilityLootTableInfo[]> {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();
  const playerStore = usePlayerStore();

  const { checkRequirements } = useRequirements(ctx as unknown as RequirementContext);
  const { stepsPerAction, fineMaterialFind } = useSkillModifiers(
    ctx as unknown as SkillModifiersContext,
  );

  // Ability ids from every equipped item; fetch their details on change.
  const abilityIds = computed(() =>
    collectEquippedAbilityIds(ctx.equippedGear.value),
  );
  watch(
    abilityIds,
    (ids) => {
      if (ids.length) void dataStore.fetchDetailedAbilities(ids);
    },
    { immediate: true },
  );

  // Abilities that roll loot AND are usable in the current context.
  const usableLootAbilities = computed(() =>
    abilityIds.value
      .map((id) => dataStore.detailedAbilitiesMap[id])
      .filter((detail) => {
        if (!detail) return false;
        if (!extractAbilityLootSpecs(detail).length) return false;
        return checkRequirements(abilityUsageRequirements(detail));
      }),
  );

  // Fetch the inner loot tables referenced by those abilities.
  const innerTableIds = computed<string[]>(() =>
    usableLootAbilities.value.flatMap((detail) =>
      extractAbilityLootSpecs(detail).flatMap((spec) => spec.tableIds),
    ),
  );
  watch(
    innerTableIds,
    (ids) => {
      if (ids.length) void dataStore.fetchDetailedLootTables(ids);
    },
    { immediate: true },
  );

  return computed<AbilityLootTableInfo[]>(() =>
    usableLootAbilities.value
      .map((detail): AbilityLootTableInfo | null => {
        const specs = extractAbilityLootSpecs(detail);
        if (!specs.length) return null;

        const stepsPerActivation = abilityStepsPerActivation(
          detail.cooldown,
          stepsPerAction.value,
        );

        const contextTables: DetailedContextLootTable[] = specs.map((spec) => ({
          isPrimary: false,
          type: spec.type,
          rollAmount: spec.rollAmount,
          rollChance: 1,
          tableSource: detail.name,
          tables: resolveLootTableWeights(
            spec.tableIds
              .map(dataStore.getDetailedLootTable)
              .filter((t): t is NonNullable<typeof t> => t !== null) as DetailedLootTable[],
            (skill: string) => playerStore.skillLevels[skill] ?? 1,
          ),
        }));

        const dropInfoMap = buildDropItemInfoMap(
          deduplicateAndGroupDrops(contextTables),
          // Actions-based cooldown → real steps per item; time-based → 0 (steps
          // hidden in the display, chance + amount still valid).
          stepsPerActivation ?? 0,
          fineMaterialFind.value,
          // Find modifiers (chestFind, findCollectibles, …) don't apply to
          // ability rolls.
          () => 1,
          itemsStore.fineMaterials,
          playerStore.skillsMap,
        );

        return {
          abilityId: detail.id,
          name: detail.name,
          icon: detail.icon,
          rollAmount: specs[0].rollAmount,
          stepsPerActivation,
          dropInfoMap,
        };
      })
      .filter((section): section is AbilityLootTableInfo => section !== null),
  );
}
