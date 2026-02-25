/**
 * Purpose:
 * Constants governing level-above-requirement bonus calculations.
 *
 * Responsibilities:
 * - Centralize per-level bonus rates used in work efficiency calculations.
 * - Centralize the level cap applied to non-travelling efficiency bonuses.
 *
 * Does NOT:
 * - Mutate global state.
 * - Contain any logic.
 */

/** Per-level work efficiency bonus when the activity is travelling. */
export const TRAVELLING_EFFICIENCY_PER_LEVEL = 0.005;

/** Per-level work efficiency bonus for all non-travelling activities and recipes. */
export const EFFICIENCY_PER_LEVEL = 0.0125;

/** Maximum number of levels above requirement counted for non-travelling efficiency. */
export const EFFICIENCY_MAX_LEVEL_CAP = 20;
