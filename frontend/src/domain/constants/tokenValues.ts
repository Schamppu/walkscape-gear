/**
 * Purpose:
 * Stores the token values for various items in the game,
 * allowing the tool to compute the total token value of an activity
 * with the equipped items.
 *
 * Responsibilities:
 * - Provide a centralized mapping of item identifiers to their token values
 * - Support different qualities of items (e.g., common, fine) with corresponding token values
 *
 * Does NOT:
 * - Mutate global state
 */

export type TokenValue = {
  common: number;
  fine?: number;
};

export type TokenValuesMap = Record<string, TokenValue>;

export const tokenValues: TokenValuesMap = {
  adventurers_guild_token: {
    common: 1,
  },
  adventurers_enamel_pin: {
    common: 2,
    fine: 10,
  },
  name_tag: {
    common: 10,
    fine: 50,
  },
  unidentified_remains: {
    common: 20,
    fine: 100,
  },
  halfmaw_scales: {
    common: 1,
    fine: 5,
  },
  halfmaw_teeth: {
    common: 3,
    fine: 15,
  },
};

export default tokenValues;
