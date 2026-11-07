import { describe, it, expect } from "vitest";
import { buildStatsList } from "@/domain/stats/statsList";
import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { StatDefinition } from "@/domain/types/stat";
import type { Stat } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeStat(overrides: Partial<Stat> = {}): Stat {
  return {
    stat: "workEfficiency",
    name: "Work Efficiency",
    type: "workEfficiency",
    isPercent: true,
    value: 0.1,
    isNegative: false,
    isMultiplicative: false,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<EffectiveAttrEntry> = {},
): EffectiveAttrEntry {
  return {
    id: "item_1",
    requirements: [],
    stats: [makeStat()],
    customText: "",
    statText: "",
    skillText: "",
    item: { id: "item_1", name: "Item 1", icon: "" },
    ...overrides,
  };
}

function makeStatDef(overrides: Partial<StatDefinition> = {}): StatDefinition {
  return {
    id: "workEfficiency",
    name: "Work Efficiency",
    type: "workEfficiency",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty inputs
// ---------------------------------------------------------------------------

describe("buildStatsList — empty inputs", () => {
  it("returns empty for no attrs and no stat defs", () => {
    expect(buildStatsList([], [])).toEqual([]);
  });

  it("produces a pseudo row when attrs exist but no stat defs", () => {
    // Without any regular stat definitions, all attrs become pseudo-stat rows
    const attrs = [makeEntry()];
    expect(buildStatsList(attrs, [])).toHaveLength(1);
    expect(buildStatsList(attrs, [])[0].data).toBeDefined();
  });

  it("returns empty when stat defs exist but no matching attrs", () => {
    const defs = [makeStatDef()];
    expect(buildStatsList([], defs)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Regular stats
// ---------------------------------------------------------------------------

describe("buildStatsList — regular stats", () => {
  it("includes a row for a matching (stat, isPercent) pair", () => {
    const attrs = [
      makeEntry({
        stats: [makeStat({ type: "workEfficiency", isPercent: true })],
      }),
    ];
    const defs = [makeStatDef({ type: "workEfficiency" })];
    const rows = buildStatsList(attrs, defs);
    expect(
      rows.some(
        (r) => r.stat.type === "workEfficiency" && r.isPercent === true,
      ),
    ).toBe(true);
  });

  it("omits the isPercent=false row when no flat attr exists", () => {
    const attrs = [makeEntry({ stats: [makeStat({ isPercent: true })] })];
    const defs = [makeStatDef()];
    const rows = buildStatsList(attrs, defs);
    expect(rows.filter((r) => r.stat.type === "workEfficiency")).toHaveLength(
      1,
    );
    expect(rows[0].isPercent).toBe(true);
  });

  it("includes both percent and flat rows when both attr types exist", () => {
    const attrs = [
      makeEntry({ stats: [makeStat({ isPercent: true })] }),
      makeEntry({ stats: [makeStat({ isPercent: false })] }),
    ];
    const defs = [makeStatDef()];
    const rows = buildStatsList(attrs, defs);
    const we = rows.filter((r) => r.stat.type === "workEfficiency");
    expect(we).toHaveLength(2);
  });

  it("regular rows have no data field", () => {
    const attrs = [makeEntry({ stats: [makeStat({ isPercent: true })] })];
    const defs = [makeStatDef()];
    const [row] = buildStatsList(attrs, defs);
    expect(row.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pseudo stats
// ---------------------------------------------------------------------------

describe("buildStatsList — pseudo stats", () => {
  it("includes a pseudo-stat row for an attr whose stat ID is not a regular stat", () => {
    const attrs = [
      makeEntry({
        stats: [
          makeStat({
            stat: "pseudo_roll",
            type: "pseudo_roll",
            isPercent: false,
          }),
        ],
        customText: "",
        skillText: "mining",
        statText: "pseudo stat",
      }),
    ];
    const rows = buildStatsList(attrs, []);
    expect(rows).toHaveLength(1);
    expect(rows[0].stat.id).toBe("pseudo_roll");
    expect(rows[0].data).toEqual({ skill: "mining", stat: "pseudo stat" });
  });

  it("uses customText as the stat name when it is non-empty", () => {
    const attrs = [
      makeEntry({
        stats: [
          makeStat({
            stat: "psuedo_x",
            name: "default name",
            type: "pseudo_x",
            isPercent: false,
          }),
        ],
        customText: "My Custom Name",
      }),
    ];
    const rows = buildStatsList(attrs, []);
    expect(rows[0].stat.name).toBe("My Custom Name");
  });

  it("falls back to the stat name when customText is empty", () => {
    const attrs = [
      makeEntry({
        stats: [
          makeStat({
            stat: "pseudo_y",
            name: "Fallback Name",
            type: "pseudo_y",
            isPercent: false,
          }),
        ],
        customText: "",
      }),
    ];
    const rows = buildStatsList(attrs, []);
    expect(rows[0].stat.name).toBe("Fallback Name");
  });

  it("deduplicates pseudo-stat rows with the same (id, isPercent)", () => {
    const attrs = [
      makeEntry({
        stats: [
          makeStat({ stat: "pseudo_z", type: "pseudo_z", isPercent: true }),
        ],
      }),
      makeEntry({
        stats: [
          makeStat({ stat: "pseudo_z", type: "pseudo_z", isPercent: true }),
        ],
      }),
    ];
    const rows = buildStatsList(attrs, []);
    expect(rows).toHaveLength(1);
  });

  it("does not deduplicate rows with same id but different isPercent", () => {
    const attrs = [
      makeEntry({
        stats: [
          makeStat({ stat: "pseudo_w", type: "pseudo_w", isPercent: true }),
        ],
      }),
      makeEntry({
        stats: [
          makeStat({ stat: "pseudo_w", type: "pseudo_w", isPercent: false }),
        ],
      }),
    ];
    const rows = buildStatsList(attrs, []);
    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

describe("buildStatsList — ordering", () => {
  it("regular rows come before pseudo rows", () => {
    const attrs = [
      makeEntry({
        stats: [
          makeStat({ stat: "pseudo_p", type: "pseudo_p", isPercent: false }),
        ],
      }),
      makeEntry({
        stats: [
          makeStat({
            stat: "workEfficiency",
            type: "workEfficiency",
            isPercent: true,
          }),
        ],
      }),
    ];
    const defs = [
      makeStatDef({ id: "workEfficiency", type: "workEfficiency" }),
    ];
    const rows = buildStatsList(attrs, defs);
    expect(rows[0].stat.type).toBe("workEfficiency");
    expect(rows[rows.length - 1].stat.type).toBe("pseudo_p");
  });
});
