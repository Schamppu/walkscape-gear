/**
 * Purpose:
 * Pure function for resolving an item's attributes into a flat list of
 * display-ready stat entries.
 *
 * Responsibilities:
 * - Call `usedAttrs` to get effective attributes for the given quality.
 * - Flatten attribute → stats.
 * - Apply `roll_special_table` name/icon override.
 * - Optionally filter by stat type.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Call `toDeepRaw` — caller is responsible for de-reactifying the item first.
 */

import { usedAttrs } from "@/domain/quality/qualityAttrs";
import type { Item, Stat, Attribute } from "@/domain/types/item";
import type { Requirement } from "@/domain/types/common";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A `Stat` extended with an optional `customIcon` used by `roll_special_table`
 * entries to display a custom icon alongside the stat text.
 */
export type DisplayStat = Stat & { customIcon?: string | null };

/** A single display-ready attribute entry. */
export type DisplayAttrEntry = {
  stat: DisplayStat;
  requirements: Requirement[];
  /** Combined requirements + stats, passed as `data` prop to child components. */
  data: { requirements: Requirement[]; stats: Stat[] };
};

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Resolves an item's effective attributes into a flat list of display entries.
 *
 * - Each attribute may contain multiple stats; every stat becomes its own entry.
 * - `roll_special_table` stats receive the attribute's `customText` as their
 *   name and the attribute's `customIcon` for display.
 * - Pass `filterStat` to narrow the result to a single stat type.
 *
 * The caller must pass a plain (non-reactive) item object — use `toDeepRaw`
 * before calling if the item comes from a Vue reactive source.
 *
 * @param item       Plain item object.
 * @param quality    Quality tier string (e.g. `"common"`, `"fine"`).
 * @param filterStat Optional stat type to restrict results to.
 */
export function resolveDisplayAttrs(
  item: Item,
  quality: string,
  filterStat?: string,
): DisplayAttrEntry[] {
  return attrsToDisplayEntries(usedAttrs(item, quality), filterStat);
}

/**
 * Maps a list of attributes into flat display entries. Shared by
 * `resolveDisplayAttrs` (item attributes) and any other source of attributes
 * that needs to render via `StatRequirementDisplay` (e.g. ability attributes).
 */
export function attrsToDisplayEntries(
  attrs: Attribute[],
  filterStat?: string,
): DisplayAttrEntry[] {
  return attrs
    .flatMap((obj) => {
      const { customText, stats, requirements } = obj;
      return stats.flatMap((stat): DisplayAttrEntry => {
        const displayStat: DisplayStat = { ...stat };
        if (stat.stat === "roll_special_table") {
          displayStat.name = customText;
          displayStat.customIcon = obj.customIcon;
        }
        const data = { requirements, stats };
        return { stat: displayStat, requirements: requirements ?? [], data };
      });
    })
    .filter(({ stat }) => !filterStat || stat.type === filterStat);
}
