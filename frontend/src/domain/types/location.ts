import type { components } from "./generated/api";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export type LocationSummary = Schemas["LocationListItem"];

export type LocationDetail = Schemas["LocationDetail"];
