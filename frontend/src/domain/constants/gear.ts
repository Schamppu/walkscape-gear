/**
 * Purpose:
 * Defines gear type and gear slot constants used for gear set construction
 * and optimiser logic.
 *
 * Does NOT:
 * - Mutate global state
 * - Contain any calculation logic
 */

import { getToolbeltSize } from "@/domain/character/characterLevel";

export const gearTypes = [
  "head",
  "cape",
  "back",
  "chest",
  "primary",
  "secondary",
  "hands",
  "legs",
  "neck",
  "feet",
  "ring",
  "tool",
  "pet",
  "consumable",
  "location",
] as const;

export type GearType = (typeof gearTypes)[number];

export const gearSlots = [
  "head",
  "cape",
  "back",
  "chest",
  "primary",
  "secondary",
  "hands",
  "legs",
  "neck",
  "feet",
  "ring1",
  "ring2",
  "tool1",
  "tool2",
  "tool3",
  "tool4",
  "tool5",
  "tool6",
  "pet",
  "consumable",
  "service",
] as const;

export type GearSlot = (typeof gearSlots)[number];

/**
 * Returns the maximum number of items that can be equipped in a given slot type.
 * Tool slots scale with character level via `getToolbeltSize`; rings allow up to 2;
 * all other slots allow exactly 1.
 *
 * @param level - Character level used to determine toolbelt size. Defaults to 99
 *   (maximum toolbelt) when omitted.
 */
export const slotMax = (slotName: string, level: number = 99): number => {
  if (slotName === "tool") return getToolbeltSize(level);
  if (slotName === "ring") return 2;
  return 1;
};
