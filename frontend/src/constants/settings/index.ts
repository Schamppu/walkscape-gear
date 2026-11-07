/**
 * Intent:
 * - This folder groups constants used for user settings and their UI
 *   (selection lists, option maps, priorities, separators, etc.).
 * - Expose a small, well-typed surface for importing settings-related
 *   constants so callers import from `@/constants/settings` rather than
 *   individual files. This centralizes intent and makes refactors easier.
 * - Types defined here (or re-exported) are the canonical types for
 *   settings-related options across the app.
 */

export * from "./types";
export * from "./separators";
export * from "./optimiserPriorities";
export * from "./settingOptions";

export { default as separators } from "./separators";
export { default as optimiserPriorities } from "./optimiserPriorities";
export { default as settingOptions } from "./settingOptions";
