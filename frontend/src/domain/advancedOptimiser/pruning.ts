/**
 * Purpose:
 * Removes items that can never be part of a better gear set than some other
 * item of the same slot type, so the search has fewer options to try.
 *
 * `a` dominates `b` when, for every stat key of either item, `a` is at least
 * as good (a missing stat counts as 0), it is strictly better on at least one
 * key, and `a` has every keyword and ability `b` has. Because every stat is
 * monotone (more work efficiency is never worse, even past the cap), such a
 * swap can't lower any set's score:
 * - An item with an extra −work efficiency never dominates.
 * - Conditional stats (e.g. realm-only, set bonuses) are compared only with
 *   stats under the same requirements.
 * - Keyword-dependent value (set pieces, required keywords) is protected by
 *   the keyword rule.
 *
 * Replaces `filterDirectUpgrades` (quick set), which compares absolute values
 * and ignores keywords and conditional stats.
 *
 * Does NOT:
 * - Import Vue / reactive APIs.
 * - Score items on their own; whether an item is good is only decided by
 *   scoring whole sets.
 */

import type { Stat } from "@/domain/types/item";
import type { WorkerItem } from "@/workers/optimiserWorkerTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Profile = {
  item: WorkerItem;
  /** Stat key → summed goodness (value × direction). */
  stats: Map<string, number>;
  /** Keywords and `ability:<id>` tags. */
  tags: Set<string>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stats where a lower value is better. */
const LOWER_IS_BETTER = new Set(["stepsRequired"]);

/** How much a stat helps: its value, sign-flipped for lower-is-better stats. */
export const statGoodness = (stat: Pick<Stat, "type" | "value">): number =>
  LOWER_IS_BETTER.has(stat.type) ? -stat.value : stat.value;

const statKey = (stat: Stat, requirementsKey: string): string => {
  const { type, isPercent } = stat;
  const skill = "skill" in stat && stat.skill ? `:${stat.skill}` : "";
  return `${type}${skill}|${isPercent ? "%" : "flat"}|${requirementsKey}`;
};

const buildProfile = (item: WorkerItem, isUseful: (stat: Stat) => boolean): Profile => {
  const stats = new Map<string, number>();
  for (const entry of item._attrEntries) {
    const requirementsKey = JSON.stringify(entry.requirements ?? []);
    for (const stat of entry.stats) {
      if (!isUseful(stat)) continue;
      const key = statKey(stat, requirementsKey);
      stats.set(key, (stats.get(key) ?? 0) + statGoodness(stat));
    }
  }

  const abilities = (item.abilities ?? []).map(
    (a) => `ability:${typeof a === "object" ? a.ability : a}`,
  );
  return { item, stats, tags: new Set([...(item.keywords ?? []), ...abilities]) };
};

const isSubset = (a: Set<string>, b: Set<string>): boolean => [...a].every((t) => b.has(t));

/**
 * True when `a` is never worse than `b` in any set. `sameTags` requires equal
 * keywords, for multi-slot types where extra keywords can clash with the
 * other slots' banned keywords.
 */
const dominates = (a: Profile, b: Profile, sameTags: boolean): boolean => {
  if (!isSubset(b.tags, a.tags)) return false;
  if (sameTags && a.tags.size !== b.tags.size) return false;

  let strictlyBetter = false;
  for (const key of new Set([...a.stats.keys(), ...b.stats.keys()])) {
    const diff = (a.stats.get(key) ?? 0) - (b.stats.get(key) ?? 0);
    if (diff < 0) return false;
    if (diff > 0) strictlyBetter = true;
  }
  return strictlyBetter;
};

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * True when the item has at least one stat in `useful` that helps (including
 * conditional ones, e.g. set bonuses or realm-only stats). Items with only
 * penalties or irrelevant stats can never improve a set.
 */
export const hasUsefulStat = (item: WorkerItem, useful: ReadonlySet<string>): boolean =>
  item._attrEntries.some(({ stats }) =>
    stats.some((stat) => useful.has(stat.stat) && statGoodness(stat) > 0),
  );

/**
 * Drops each item that at least `slotCounts[slotKey]` other items dominate
 * (e.g. a ring is only dropped if two better rings exist).
 *
 * @param options    Items per slot key.
 * @param slotCounts How many slots of each type can be filled (ring: 2, …).
 *                   Missing keys count as 1.
 * @param isUseful   Which stats to compare; others are ignored.
 */
export const pruneDominated = (
  options: Record<string, WorkerItem[]>,
  slotCounts: Record<string, number>,
  isUseful: (stat: Stat) => boolean = () => true,
): Record<string, WorkerItem[]> =>
  Object.fromEntries(
    Object.entries(options).map(([slotKey, items]) => {
      const slotCount = slotCounts[slotKey] ?? 1;
      const profiles = items.map((item) => buildProfile(item, isUseful));
      const kept = profiles.filter((b) => {
        let dominators = 0;
        for (const a of profiles) {
          if (a !== b && dominates(a, b, slotCount > 1) && ++dominators >= slotCount) {
            return false;
          }
        }
        return true;
      });
      return [slotKey, kept.map(({ item }) => item)];
    }),
  );
