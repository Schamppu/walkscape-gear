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

export const consumableQualityOptions: QualityOption[] = [
  {
    name: "Common",
    value: "consumableCommon",
  },
  {
    name: "Fine",
    value: "consumableFine",
  },
];

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
