/**
 * Purpose:
 * Pure utility for resolving the correct icon sprite for a pet at a given level.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Mutate any input data.
 */

import type { PetItem } from "@/domain/types/item";

/**
 * Returns the sprite path for a pet based on its current level.
 *
 * @param pet      The pet item data.
 * @param level    The current level of the pet. 0 returns the egg sprite.
 * @param isRare   Whether to use the rare/shiny look variant.
 */
export function getPetIcon(pet: PetItem, level: number | string, isRare = false): string {
  const numLevel = Number(level) || 0;
  if (numLevel === 0) return pet.egg.sprite;
  const { stage } = pet.levels[numLevel - 1];
  const source = isRare ? pet.rareLooks[0].sprites : pet.looks[0].sprites;
  return source.find((look) => look.stage === stage)!.sprite;
}
