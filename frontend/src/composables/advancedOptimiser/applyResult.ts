import type { LocationDetail, LocationSummary } from "@/domain/types/location";
import type { WorkerItem } from "@/workers/optimiserWorkerTypes";
import type { SearchResult } from "@/domain/advancedOptimiser/search";

/** The store actions applying a result needs (the gear and activity stores). */
export type ApplyTargets = {
  setLocation: (location: LocationDetail | null) => void | Promise<void>;
  equipMultiple: (
    gearSetData: Record<string, { id?: string; quality?: string | null } | null>,
    useQuality?: boolean,
  ) => Promise<void>;
};

/**
 * Equips the result's items in `searchSlots` (emptying slots the result
 * leaves empty) and switches to its location. Locked slots aren't in
 * `searchSlots`, so they are never touched.
 *
 * A run stopped early is only applied with `applyStopped` (the user pressed
 * Finish rather than Cancel).
 *
 * @returns Whether anything was applied.
 */
export const applySearchResult = async (
  result: SearchResult,
  searchSlots: readonly string[],
  { setLocation, equipMultiple }: ApplyTargets,
  { applyStopped = false }: { applyStopped?: boolean } = {},
): Promise<boolean> => {
  if (result.cancelled && !applyStopped) return false;

  const location = result.gearSet.location as LocationSummary | null | undefined;
  if (location) await setLocation(location as unknown as LocationDetail);

  const payload = Object.fromEntries(
    searchSlots.map((slot) => {
      const item = result.gearSet[slot] as WorkerItem | null | undefined;
      return [slot, item?.id ? { id: item.id, quality: item.quality ?? null } : null];
    }),
  );
  await equipMultiple(payload, true);
  return true;
};
