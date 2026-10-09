/**
 * Activity types, aliased from the generated OpenAPI types
 * (`./generated/api`, regenerate with `npm run gen:api-types`).
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Contain any logic.
 */

import type { components } from "./generated/api";

type Schemas = components["schemas"];

export type ActivitySummary = Schemas["ActivityListItem"];

export type ActivityDetail = Schemas["ActivityDetail"];

export type ActivityRequiredKeyword = NonNullable<ActivityDetail["requiredKeywords"]>[number];

export type KeywordInputActivity = Schemas["KeywordInput"];

export type SpecificInputActivity = Schemas["SpecificInput"];

export type ActivityInput = KeywordInputActivity | SpecificInputActivity;

/** Discriminated on `type` ("inputActivity", "limitedActivity"). */
export type ActivityOption = Schemas["ActivityInput"];

export type ActivityInputOption = Extract<ActivityOption, { type: "inputActivity" }>;

export type ActivityLimitedOption = Extract<ActivityOption, { type: "limitedActivity" }>;

export type ActivityReward = Schemas["FactionReputationReward"];
