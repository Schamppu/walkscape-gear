/**
 * Whether the player owns an item.
 *
 * Un-owning an item keeps its entry in the owned items map (with
 * `owned: false`) so its other fields survive, and hidden items are stored
 * the same way. Presence in the map therefore does not mean ownership; the
 * `owned` flag does.
 */
export function isOwned(
  ownedItems: Record<string, { owned?: boolean } | undefined>,
  id: string,
): boolean {
  return ownedItems[id]?.owned === true;
}
