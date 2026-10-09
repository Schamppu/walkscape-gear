import type { components } from "./generated/api";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// Pets - API response types
// ---------------------------------------------------------------------------

export type PetSummary = Schemas["PetListItem"];

export type PetDetail = Schemas["PetDetail"];

export type PetAbility = PetDetail["abilities"][number];
