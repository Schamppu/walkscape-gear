/**
 * Purpose:
 * Pure helpers that resolve a pet's unlocked abilities into stat attributes and
 * attach them to the pet object, so `usedAttrs` (and thus every consumer of it:
 * stat totals, loot/drops context, item stat displays) picks them up uniformly.
 *
 * Responsibilities:
 * - Resolve which of a pet's abilities are unlocked at a given level.
 * - Gate active abilities by the user's toggle state (enabled by default).
 * - Tag each resolved attribute with the ability as its source (`sourceItem`).
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access stores or perform side effects (all inputs arrive via context).
 */

import type { Attribute } from "@/domain/types/item";
import type { PetAbility } from "@/domain/types/pet";
import type { AbilityDetail } from "@/domain/types/ability";

/**
 * Extracts all stat attributes an ability grants. Passive abilities carry them
 * at the root (`attributes`); active abilities nest them under
 * `data[].actions[]` of type `effect`. Returns the combined list.
 */
export function abilityAttributes(
  detail: Pick<AbilityDetail, "attributes" | "data"> | null | undefined,
): Attribute[] {
  if (!detail) return [];
  const root = detail.attributes ?? [];
  const nested = (detail.data ?? []).flatMap((d) =>
    (d.actions ?? []).flatMap((action) =>
      action.type === "effect" && Array.isArray(action.attributes)
        ? action.attributes
        : [],
    ),
  );
  return [...root, ...nested];
}

/** Minimal ability summary needed to label a source. */
export type AbilitySource = {
  id: string;
  name: string;
  icon: string;
  type: string;
};

/**
 * Plain (non-reactive) context assembled by the composable/store layer and
 * passed into these pure helpers.
 */
export type AbilityAttrContext = {
  /** ability id -> attributes (from detailedAbilitiesMap[id].attributes) */
  attrsById: Record<string, Attribute[]>;
  /** ability id -> summary (name/icon/type) from abilitiesMap */
  summaryById: Record<string, AbilitySource>;
  /** active ability ids the user has toggled OFF (default state is enabled) */
  disabledActiveAbilityIds: Set<string>;
};

type PetLike = { abilities?: PetAbility[] };

/**
 * Returns the `Attribute[]` a pet contributes via its unlocked abilities.
 * Passive abilities are always on; active (non-passive) abilities are on unless
 * toggled off. Each attribute is tagged with the ability as its `sourceItem`
 * so downstream aggregation attributes the stat to the ability, not the pet.
 */
export function resolvePetAbilityAttrs(
  pet: PetLike,
  level: number,
  ctx: AbilityAttrContext,
): Attribute[] {
  if (!pet.abilities?.length) return [];

  const attrs: Attribute[] = [];
  for (const { unlockLevel, ability: id } of pet.abilities) {
    if (unlockLevel > level) continue;

    const summary = ctx.summaryById[id];
    if (!summary) continue;

    const passive = summary.type === "passive";
    if (!passive && ctx.disabledActiveAbilityIds.has(id)) continue;

    for (const attr of ctx.attrsById[id] ?? []) {
      attrs.push({
        ...attr,
        sourceItem: { id: summary.id, name: summary.name, icon: summary.icon },
      });
    }
  }
  return attrs;
}

/**
 * Returns a copy of `item` with resolved ability attributes attached when it is
 * a pet; otherwise returns the item unchanged. The pet's level is read from its
 * `quality` field (pets carry their level as the quality string).
 */
export function attachPetAbilityAttrs<T>(item: T, ctx: AbilityAttrContext): T {
  if (
    !item ||
    typeof item !== "object" ||
    !("egg" in item) ||
    !("abilities" in item)
  ) {
    return item;
  }
  const level = Number((item as { quality?: string | null }).quality) || 0;
  const abilityAttrs = resolvePetAbilityAttrs(item as PetLike, level, ctx);
  return abilityAttrs.length ? { ...item, abilityAttrs } : item;
}

/**
 * Collects the ids of a pet's unlocked abilities (for prefetching their
 * details). Not filtered by toggle state — details are needed for all unlocked
 * abilities regardless of enabled/disabled.
 */
export function unlockedAbilityIds(
  pet: PetLike | null | undefined,
  level: number,
): string[] {
  if (!pet?.abilities?.length) return [];
  return pet.abilities
    .filter(({ unlockLevel }) => unlockLevel <= level)
    .map(({ ability }) => ability);
}
