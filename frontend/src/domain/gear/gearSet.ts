/**
 * Purpose:
 * Factory functions for creating empty gear set and gear set selection objects.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs
 * - Mutate external state
 * - Contain calculation logic
 */

import type { GearSlot } from "@/domain/constants/gear";

export type GearSet = Record<GearSlot, unknown>;

export type GearSetSelection = {
  id: number | null;
  name: string;
  tags: unknown[];
  items: unknown[];
  isDirty: boolean;
  isNew: boolean;
};

export function createEmptyGearSet(): GearSet {
  return {
    head: null,
    cape: null,
    back: null,
    chest: null,
    primary: null,
    secondary: null,
    hands: null,
    legs: null,
    neck: null,
    feet: null,
    ring1: null,
    ring2: null,
    tool1: null,
    tool2: null,
    tool3: null,
    tool4: null,
    tool5: null,
    tool6: null,
    pet: null,
    consumable: null,
    service: null,
    activityInput: null,
  };
}

export function createEmptyGearSetSelection(): GearSetSelection {
  return {
    id: null,
    name: "",
    tags: [],
    items: [],
    isDirty: false,
    isNew: true,
  };
}
