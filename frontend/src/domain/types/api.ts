/**
 * Purpose:
 * Shared API response types used across the domain and store layers.
 *
 * Covers list-level (summary) shapes returned by the backend.
 * Detailed single-item responses are intentionally omitted —
 * they require many examples to capture all variants.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { QualityAttr, Buff } from "./item";

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

export type AbilitySummary = {
  id: string;
  name: string;
  type: string;
  desc: string;
  icon: string;
};

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type ApInfo = {
  total: number;
  collectibles: number;
  normal: number;
  easy: number;
  hard: number;
  extreme: number;
};

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export type ActivitySummary = {
  id: string;
  name: string;
  relatedSkillsList: string[];
  icon: string;
};

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export type Faction = {
  id: string;
  name: string;
  color: string;
  reputation: string | null;
  icon: string;
};

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

export type Keyword = {
  id: string;
  name: string;
  bannedKeywords: string[];
  icon?: string;
};

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export type Skill = {
  id: string;
  nameLocalizationKey: string;
  name: string;
  icon: string;
  iconBig: string;
  type: string;
  typeIcon: string;
  typeIconBig: string;
};

// ---------------------------------------------------------------------------
// Items (summary — list endpoints)
// ---------------------------------------------------------------------------

export type ItemSummary = {
  id: string;
  name: string;
  icon: string;
};

// ---------------------------------------------------------------------------
// Items (categorized — full detail per item in categories)
// ---------------------------------------------------------------------------

export type Requirement = {
  type: string;
  name: string | null;
  opposite: boolean;
  requirement: Record<string, unknown>;
};

export type ItemAttrStat = {
  stat: string;
  name: string;
  type: string;
  isPercent: boolean;
  value: number;
  isNegative: boolean;
  isMultiplicative: boolean;
};

export type ItemAttr = {
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
  stats: ItemAttrStat[];
};

export type CategorizedItem = {
  id: string;
  name: string;
  keywords: string[];
  type: string;
  quality: string;
  consumableType: string | null;
  gearType: string | null;
  requirements: Requirement[];
  itemAttrs: ItemAttr[];
  itemQualityAttrs: QualityAttr[];
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
  items: CategorizedItem[];
};

export type ItemCategoryGroup = {
  title: string;
  categories: ItemCategory[];
};

// ---------------------------------------------------------------------------
// Items — value mapping
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
// Items — URL mapping
// ---------------------------------------------------------------------------

export type UrlMap = Record<string, (string | null)[]>;

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export type LocationSummary = {
  id: string;
  name: string;
  faction: string;
  subFactions: string[];
  keywords: string[];
  icon: string;
};

// ---------------------------------------------------------------------------
// Locations — detailed (realm default)
// ---------------------------------------------------------------------------

export type RealmDefaultLocation = {
  id: string;
  name: string;
  keywords: string[];
  faction: string;
  subFactions: string[];
  activityList: string[];
  serviceList: string[];
  buildingList: string[];
  jobBoards: string[];
  icon: string;
};

// ---------------------------------------------------------------------------
// Loot tables
// ---------------------------------------------------------------------------

export type LootTableSummary = {
  id: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

export type PetSpriteSummary = {
  sprite: string;
  sheet: string;
  stage: string;
};

export type PetLookSummary = {
  id: string;
  sprites: PetSpriteSummary[];
};

export type PetEggSummary = {
  name: string;
  desc: string;
  sprite: string;
  sheet: string;
};

export type PetSummary = {
  id: string;
  name: string;
  desc: string;
  egg: PetEggSummary;
  looks: PetLookSummary[];
  rareLooks: PetLookSummary[];
};

export type PetLevel = {
  level: number;
  xp: number;
  stage: string;
  attributes: ItemAttr[];
};

export type PetAbility = {
  unlockLevel: number;
  ability: string;
};

export type PetDetail = PetSummary & {
  hatchingRequirements: Requirement[] | null;
  xpRequirements: Requirement[];
  levels: PetLevel[];
  abilities: PetAbility[];
};

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export type RecipeSummary = {
  id: string;
  name: string;
  relatedSkills: string[];
  icon: string;
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export type RouteOption = {
  options: Record<string, boolean>;
  terrainModifiers: string[];
};

export type RouteSummary = {
  id: string;
  name: string;
  locations: string[];
  distance: number;
  distanceModifier: number;
  options?: RouteOption[];
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export type StatDefinition = {
  id: string;
  name: string;
  type: string;
  icon?: string;
};

// ---------------------------------------------------------------------------
// Terrain modifiers
// ---------------------------------------------------------------------------

export type TerrainModifier = {
  id: string;
  name: string;
  requirements: Requirement[];
  keyword: string[];
};

// ---------------------------------------------------------------------------
// Icons — batch response
// ---------------------------------------------------------------------------

export type IconBatchResponse = Record<string, string>;
