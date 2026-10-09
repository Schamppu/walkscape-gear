/**
 * Purpose:
 * Neighbourhoods for the advanced optimiser's local search: the sets reachable
 * from a gear set by one move.
 *
 * Single swaps alone can't climb into a set bonus or a work-efficiency-cap
 * combination (the first piece on its own scores worse), so there are also
 * sampled pair swaps and "set moves" that equip several items sharing a
 * keyword at once.
 *
 * Does NOT:
 * - Import Vue / reactive APIs.
 * - Score sets or decide which move to take (see `search.ts`).
 */

import type { LocationSummary } from "@/domain/types/location";
import type { WorkerGearSet, WorkerItem } from "@/workers/optimiserWorkerTypes";
import { slotKeyOf, slotOptions, type BeamOptions } from "./beam";

export type MoveContext = {
  /** Slots the search may change (locked slots excluded). */
  slots: readonly string[];
  options: Record<string, WorkerItem[]>;
  locations: readonly LocationSummary[];
  keywordsMap: BeamOptions["keywordsMap"];
  /** Keywords that set bonuses or keyword requirements depend on. */
  setKeywords: readonly string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sameItem = (a: unknown, b: WorkerItem): boolean => {
  const item = a as WorkerItem | null | undefined;
  return !!item && item.id === b.id && item.quality === b.quality;
};

const withSlot = (set: WorkerGearSet, slot: string, item: WorkerItem | null): WorkerGearSet => {
  const next = { ...set };
  if (item) next[slot] = item;
  else delete next[slot];
  return next;
};

/** Options for `slot` other than what it already holds. */
const alternatives = (set: WorkerGearSet, slot: string, ctx: MoveContext): WorkerItem[] =>
  slotOptions(withSlot(set, slot, null), slot, ctx.options, ctx.keywordsMap).filter(
    (item) => !sameItem(set[slot], item),
  );

const pick = <T>(items: readonly T[], random: () => number): T | undefined =>
  items[Math.floor(random() * items.length)];

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Keywords used by `distinctKeywordItemsEquipped` or keyword-equipped
 * requirements in any option's attributes.
 */
export const collectSetKeywords = (options: Record<string, WorkerItem[]>): string[] => {
  const keywords = new Set<string>();
  for (const item of Object.values(options).flat()) {
    for (const { requirements } of item._attrEntries) {
      for (const req of requirements ?? []) {
        if (req.type === "distinctKeywordItemsEquipped") {
          req.requirement.keywords.forEach((kw) => keywords.add(kw));
        } else if (req.type === "keywordEquipped" || req.type === "keywordWithLevelEquipped") {
          keywords.add(req.requirement.keyword);
        }
      }
    }
  }
  return [...keywords];
};

/** Every set that differs from `set` in one slot (including emptying it) or the location. */
export function* singleMoves(set: WorkerGearSet, ctx: MoveContext): Generator<WorkerGearSet> {
  for (const slot of ctx.slots) {
    if (set[slot]) yield withSlot(set, slot, null);
    for (const item of alternatives(set, slot, ctx)) yield withSlot(set, slot, item);
  }
  const currentId = (set.location as LocationSummary | null | undefined)?.id;
  for (const location of ctx.locations) {
    if (location.id !== currentId) yield { ...set, location };
  }
}

/** `count` random two-slot changes. */
export function* pairMoves(
  set: WorkerGearSet,
  ctx: MoveContext,
  count: number,
  random: () => number,
): Generator<WorkerGearSet> {
  if (ctx.slots.length < 2) return;
  for (let i = 0; i < count; i++) {
    const first = pick(ctx.slots, random)!;
    const second = pick(ctx.slots.filter((s) => s !== first), random)!;
    const firstItem = pick(alternatives(set, first, ctx), random);
    if (!firstItem) continue;
    const afterFirst = withSlot(set, first, firstItem);
    const secondItem = pick(alternatives(afterFirst, second, ctx), random);
    if (secondItem) yield withSlot(afterFirst, second, secondItem);
  }
}

/**
 * For each set keyword, a set with as many pieces of it as possible: every
 * slot that has an item with the keyword gets the one `rank` scores highest
 * (filled one slot at a time, so later pieces see the earlier ones).
 */
export function* setMoves(
  set: WorkerGearSet,
  ctx: MoveContext,
  rank: (set: WorkerGearSet) => number,
): Generator<WorkerGearSet> {
  for (const keyword of ctx.setKeywords) {
    let next = set;
    let changed = false;
    for (const slot of ctx.slots) {
      const pieces = alternatives(next, slot, ctx).filter((item) =>
        item.keywords?.includes(keyword),
      );
      if (!pieces.length || (next[slot] as WorkerItem | undefined)?.keywords?.includes(keyword)) {
        continue;
      }
      let best = pieces[0];
      let bestRank = rank(withSlot(next, slot, best));
      for (const piece of pieces.slice(1)) {
        const r = rank(withSlot(next, slot, piece));
        if (r > bestRank) {
          best = piece;
          bestRank = r;
        }
      }
      next = withSlot(next, slot, best);
      changed = true;
    }
    if (changed) yield next;
  }
}

/** `set` with `count` random slots changed, for restarts. */
export const perturb = (
  set: WorkerGearSet,
  ctx: MoveContext,
  count: number,
  random: () => number,
): WorkerGearSet => {
  let next = set;
  for (let i = 0; i < count && ctx.slots.length; i++) {
    const slot = pick(ctx.slots, random)!;
    const choices: (WorkerItem | null)[] = [...alternatives(next, slot, ctx), null];
    next = withSlot(next, slot, pick(choices, random) ?? null);
  }
  if (ctx.locations.length && random() < 0.25) {
    next = { ...next, location: pick(ctx.locations, random)! };
  }
  return next;
};

/** Slot types in `slots` and how many slots each has (ring: 2, tool: 4, …). */
export const countSlots = (slots: readonly string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const slot of slots) counts[slotKeyOf(slot)] = (counts[slotKeyOf(slot)] ?? 0) + 1;
  return counts;
};
