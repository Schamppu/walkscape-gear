import type { components } from "./generated/api";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export type ServiceSummary = Schemas["ServiceListItem"];

export type ServiceDetail = Schemas["ServiceDetail"];
