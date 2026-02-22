/**
 * Purpose:
 * Shared item-related types used across the domain layer.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

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
  requirements: unknown[];
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
  itemAttrs: Attribute[];
  itemQualityAttrs?: QualityAttr[];
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
// Union
// ---------------------------------------------------------------------------

export type Item = GearItem | PetItem;
