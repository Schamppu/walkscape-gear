/**
 * Purpose:
 * Stores the quality options used in the application for items, crafting, consumables, and pets.
 *
 * Responsibilities:
 * - Provide a centralized location for quality options used across the application
 * - Facilitate easy updates and maintenance of quality options
 *
 * Does NOT:
 * - Mutate global state
 */

export type QualityOption = {
  name: string;
  value: string;
};

export const craftingQualityOptions: QualityOption[] = [
  {
    name: "Normal",
    value: "common",
  },
  {
    name: "Good",
    value: "uncommon",
  },
  {
    name: "Great",
    value: "rare",
  },
  {
    name: "Excellent",
    value: "epic",
  },
  {
    name: "Perfect",
    value: "legendary",
  },
  {
    name: "Eternal",
    value: "ethereal",
  },
];

export const qualityOptions: QualityOption[] = [
  {
    name: "Common",
    value: "common",
  },
  {
    name: "Uncommon",
    value: "uncommon",
  },
  {
    name: "Rare",
    value: "rare",
  },
  {
    name: "Epic",
    value: "epic",
  },
  {
    name: "Legendary",
    value: "legendary",
  },
  {
    name: "Ethereal",
    value: "ethereal",
  },
];

/** Plain "common" / "fine", as in the game and API. */
export const consumableQualityOptions: QualityOption[] = [
  {
    name: "Common",
    value: "common",
  },
  {
    name: "Fine",
    value: "fine",
  },
];

/**
 * Maps the old consumable qualities ("consumableCommon" / "consumableFine",
 * used before 2026-10-09) to "common" / "fine". Other values pass through.
 * For gear sets saved with the old names.
 */
export const normalizeConsumableQuality = <T extends string | null | undefined>(quality: T): T | "common" | "fine" =>
  quality === "consumableCommon" ? "common" : quality === "consumableFine" ? "fine" : quality;

export const petQualityOptions: QualityOption[] = [
  {
    name: "Normal",
    value: "common",
  },
  {
    name: "Rare",
    value: "rare",
  },
];

export default {
  craftingQualityOptions,
  qualityOptions,
  consumableQualityOptions,
  petQualityOptions,
};
