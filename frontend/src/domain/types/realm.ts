import type { Faction } from "./faction";

// ---------------------------------------------------------------------------
// Realms
// ---------------------------------------------------------------------------

/**
 * A faction that owns locations, assembled on the frontend (store/data.ts)
 * from the faction and location lists.
 */
export type Realm = Faction & {
  locationCount: number;
};
