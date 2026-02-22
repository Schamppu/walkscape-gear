/**
 * Purpose:
 * Defines gear type and gear slot constants used for gear set construction
 * and optimiser logic.
 *
 * Does NOT:
 * - Mutate global state
 * - Contain any calculation logic
 */

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
