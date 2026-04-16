/**
 * Purpose:
 * Pure function for resolving an activity's input options into display-ready
 * objects for the UI.
 *
 * Responsibilities:
 * - Filter activity options to `inputActivity` entries.
 * - Map each raw `ActivityInput` to a resolved display object.
 * - Determine `canBeFine` for keyword and specific inputs.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

import type {
  ActivityOption,
  ActivityInputOption,
} from "@/domain/types/activity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal keyword shape needed for resolution. */
export type KeywordRef = {
  name: string;
  icon?: string;
};

/** Minimal material shape needed for resolution. */
export type MaterialRef = {
  id: string;
  name: string;
  icon: string;
  keywords?: string[];
};

/** External lookups injected from the store/composable layer. */
export type ActivityInputLookups = {
  /** Returns keyword display data by ID, or null when not found. */
  getKeyword: (id: string) => KeywordRef | null;
  /** All materials for the current activity, keyed by item ID. */
  materialsById: Record<string, MaterialRef>;
  /** IDs of items that have a fine variant (`{ [id]: true }`). */
  fineMaterialIds: Record<string, boolean>;
};

/** A single resolved input ready for display. */
export type ResolvedActivityInput = {
  name: string;
  icon: string | undefined;
  quantity: number | undefined;
  canBeFine: boolean;
};

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Resolves an activity's `options` array into display-ready input objects.
 *
 * - Keyword inputs: looks up the keyword name/icon; `canBeFine` is true when
 *   every material carrying that keyword is a fine material.
 * - Specific inputs: looks up the item directly; `canBeFine` is true when the
 *   specific item is a fine material.
 * - Unknown input types and unresolvable lookups produce no output.
 *
 * @param options     Raw activity options (may be null / undefined).
 * @param lookups     Store-derived lookup data, injected from the component.
 */
export function resolveActivityInputs(
  options: ActivityOption[] | null | undefined,
  lookups: ActivityInputLookups,
): ResolvedActivityInput[] {
  const { getKeyword, materialsById, fineMaterialIds } = lookups;

  return (options ?? [])
    .filter((opt): opt is ActivityInputOption => opt?.type === "inputActivity")
    .flatMap(({ inputs }) => inputs)
    .map((input): ResolvedActivityInput | null => {
      if (input.type === "keyword") {
        const kw = getKeyword(input.keyword);
        if (!kw) return null;

        const keywordMaterials = Object.values(materialsById).filter((m) =>
          m.keywords?.includes(input.keyword),
        );
        const canBeFine =
          keywordMaterials.length > 0 &&
          keywordMaterials.every(({ id }) => id in fineMaterialIds);

        return {
          name: kw.name,
          icon: kw.icon,
          quantity: undefined,
          canBeFine,
        };
      }

      if (input.type === "specific") {
        const mat = materialsById[input.item];
        if (!mat) return null;

        return {
          name: mat.name,
          icon: mat.icon,
          quantity: input.quantity,
          canBeFine: input.item in fineMaterialIds,
        };
      }

      return null;
    })
    .filter((x): x is ResolvedActivityInput => x !== null);
}
