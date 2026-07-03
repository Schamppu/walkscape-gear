/**
 * Purpose:
 * Pure helper for collecting ability ids from a list of equipped items.
 *
 * Two ability shapes exist across item types:
 * - pets carry `{ unlockLevel, ability }[]`, gated by the pet's level (quality)
 * - other gear carries a plain array of ability id strings
 *
 * Does NOT import Vue / reactive APIs or access stores.
 */

type AbilityEntry = string | { ability?: string; unlockLevel?: number };
type EquippedLike = { abilities?: unknown; quality?: string | null } | null | undefined;

/** Returns the de-duplicated ability ids unlocked across the given items. */
export function collectEquippedAbilityIds(items: EquippedLike[]): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    const list = item?.abilities as AbilityEntry[] | undefined;
    if (!list?.length) continue;
    const level = Number(item?.quality) || 0;
    for (const entry of list) {
      if (typeof entry === "string") {
        ids.add(entry);
      } else if (entry?.ability && (entry.unlockLevel ?? 0) <= level) {
        ids.add(entry.ability);
      }
    }
  }
  return [...ids];
}
