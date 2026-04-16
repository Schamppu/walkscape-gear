/**
 * Purpose:
 * Types for the backend DB API layer.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

// ---------------------------------------------------------------------------
// Player Stats
// ---------------------------------------------------------------------------

export type DbPlayerStats = Record<string, number>;

// ---------------------------------------------------------------------------
// Owned Items
// ---------------------------------------------------------------------------

export type DbOwnedItem = {
  itemId: string;
  owned: boolean;
  hidden: boolean;
  quantity: number;
  craftedTier: string | null;
  craftedTier2: string | null;
  consumableCommon: boolean;
  consumableFine: boolean;
  petLevel: number | null;
  petRarity: string | null;
};

// ---------------------------------------------------------------------------
// Faction Reputations
// ---------------------------------------------------------------------------

export type DbFactionReputations = Record<string, number>;

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export type DbTag = {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
};

// ---------------------------------------------------------------------------
// Gear Sets
// ---------------------------------------------------------------------------

export type GearSlotType =
  | "head"
  | "cape"
  | "back"
  | "chest"
  | "primary"
  | "secondary"
  | "hands"
  | "legs"
  | "neck"
  | "feet"
  | "ring"
  | "tool"
  | "potion"
  | "consumable"
  | "service"
  | "pet"
  | "activityInput";

export type DbGearSetItem = {
  id: number;
  gearSetId: number;
  slotType: GearSlotType;
  slotIndex: number;
  itemId: string;
  quality: string;
};

export type DbGearSet = {
  id: number;
  userUuid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  sortOrder: number | null;
  tags: string[];
};

export type DbGearSetDetail = DbGearSet & {
  items: DbGearSetItem[];
};

export type DbGearSetExport = {
  name: string;
  items: Pick<DbGearSetItem, "slotType" | "slotIndex" | "itemId" | "quality">[];
  tags: string[];
};

export type UpsertGearSetPayload = {
  id?: number;
  name: string;
  tags: string[];
  items: Pick<DbGearSetItem, "slotType" | "slotIndex" | "itemId" | "quality">[];
};

export type UpsertGearSetResponse = {
  message: string;
  gearSetId: number;
};

export type DeleteGearSetResponse = {
  message: string;
};

// ---------------------------------------------------------------------------
// User Settings
// ---------------------------------------------------------------------------

export type DbUserSetting = {
  value: boolean;
  display: number;
};

export type DbUserSettings = Record<string, DbUserSetting>;

export type UpsertSettingEntry = {
  setting: string;
  value: boolean;
  display: number;
};
