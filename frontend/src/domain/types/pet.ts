import type { Requirement } from "./common";
import type { PetEgg, PetLook, PetLevel } from "./item";

// ---------------------------------------------------------------------------
// Pets - API response types
// ---------------------------------------------------------------------------

export type PetSummary = {
  id: string;
  name: string;
  desc: string;
  egg: PetEgg;
  looks: PetLook[];
  rareLooks: PetLook[];
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
