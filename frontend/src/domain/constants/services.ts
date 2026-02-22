/**
 * Purpose:
 * Defines ordered service tier constants used for filtering and sorting services.
 *
 * Does NOT:
 * - Mutate global state
 * - Contain any calculation logic
 */

export const serviceTiers = ["basic", "advanced", "expert"] as const;

export type ServiceTier = (typeof serviceTiers)[number];
