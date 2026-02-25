/**
 * Purpose:
 * Pure slot-configuration helpers used by both `gear.ts` and `requirements.ts`.
 * Extracted here to break the otherwise circular dependency between those two
 * modules.
 */

/**
 * Returns the maximum number of items that can be equipped in a given slot type.
 */
export const slotMax = (slotName: string): number => {
  if (slotName === "tool") return 6;
  if (slotName === "ring") return 2;
  return 1;
};
