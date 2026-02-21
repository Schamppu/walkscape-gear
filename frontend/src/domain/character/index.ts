/**
 * Domain - Character Utilities
 *
 * Purpose:
 * - Group character-related pure utilities used across the domain layer.
 *
 * Responsibilities:
 * - Export character-level calculation helpers (levelFromSteps, toolbelt size, etc.)
 * - Keep character logic framework-agnostic and easily importable from domain
 *
 * Does NOT:
 * - Contain UI logic or stateful stores
 */

export * from "./characterLevel";
export { default as characterLevel } from "./characterLevel";

export default {
  characterLevel,
};
