/**
 * Purpose:
 * Shared item-related types used across the domain layer.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { Requirement } from "./common";

// ---------------------------------------------------------------------------
// Attribute / stat types
// ---------------------------------------------------------------------------

export type Stat = {
  stat: string;
  name: string;
  type: string;
  isPercent: boolean;
  value: number;
  isNegative: boolean;
  isMultiplicative: boolean;
};

export type Attribute = {
  id: string;
  customIcon: string | null;
  customTextLocalizationKey: string | null;
  customText: string;
  textLocalizationKey: string;
  text: string;
  statText: string;
  skillText: string;
  tables: unknown | null;
  requirements: Requirement[];
  stats: Stat[];
};

export type QualityAttr = {
  quality: string;
  attributes: Attribute[];
};

// ---------------------------------------------------------------------------
// Buff types
// ---------------------------------------------------------------------------

export type BuffObj = {
  id: string;
  type: string;
  runtimeType: string;
  attributes: Attribute[];
  fineAttributes: Attribute[];
};

export type BuffData = {
  type: string;
  buffs: BuffObj[];
};

export type Buff = {
  id: string;
  data: BuffData[];
};

// ---------------------------------------------------------------------------
// Gear item types
// ---------------------------------------------------------------------------

export type GearItem = {
  itemAttrs?: Attribute[];
  itemQualityAttrs?: QualityAttr[];
};

export type ConsumableItem = {
  buffs?: Buff[] | null;
};

// ---------------------------------------------------------------------------
// Pet types
// ---------------------------------------------------------------------------

export type PetSprite = {
  sprite: string;
  sheet: string;
  stage: string;
};

export type PetLook = {
  id: string;
  sprites: PetSprite[];
};

export type PetEgg = {
  name: string;
  desc: string;
  sprite: string;
  sheet: string;
};

export type PetLevel = {
  level: number;
  xp: number;
  stage: string;
  attributes: Attribute[];
};

export type PetItem = {
  egg: PetEgg;
  looks: PetLook[];
  rareLooks: PetLook[];
  levels: PetLevel[];
};

// ---------------------------------------------------------------------------
// Material item type
// ---------------------------------------------------------------------------

export type MaterialItem = {
  materialAttrs: Attribute[];
};

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type Item = GearItem | ConsumableItem | PetItem | MaterialItem;

// ---------------------------------------------------------------------------
// Item API types
// ---------------------------------------------------------------------------

export type ItemSummary = {
  id: string;
  name: string;
  icon: string;
};

export type ItemDetail = {
  id: string;
  name: string;
  keywords: string[];
  type: string;
  quality: string;
  consumableType: string | null;
  gearType: string | null;
  requirements: Requirement[];
  itemAttrs: Attribute[];
  itemQualityAttrs: QualityAttr[];
  materialAttrs?: Attribute[];
  itemValue: string;
  itemValueModifier: number;
  buffs: Buff[];
  tables: unknown[];
  canBeFine: boolean;
  icon: string;
};

export type ItemCategory = {
  title: string;
  key: string;
  items: ItemDetail[];
};

export type ItemCategoryGroup = {
  title: string;
  categories: ItemCategory[];
};

// ---------------------------------------------------------------------------
// Item value mapping
// ---------------------------------------------------------------------------

export type QualityValues = {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
  ethereal: number;
};

export type ItemValueMap = Record<string, QualityValues>;

// ---------------------------------------------------------------------------
// Item URL mapping
// ---------------------------------------------------------------------------

export type UrlMap = Record<string, (string | null)[]>;
