import { describe, it, expect } from "vitest";
import { buildStatSourceList } from "@/domain/stats/statSourceList";
import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  id: string,
  statId: string,
  value: number,
  isPercent = false,
): EffectiveAttrEntry {
  return {
    id,
    requirements: [],
    stats: [
      {
        stat: statId,
        name: statId,
        type: statId,
        isPercent,
        value,
        isNegative: value < 0,
        isMultiplicative: false,
      },
    ],
    customText: "",
    statText: "",
    skillText: "",
    item: { id: `item_${id}`, name: `Item ${id}`, icon: `${id}.png` },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildStatSourceList", () => {
  it("returns empty array when allAttrs is empty", () => {
    expect(buildStatSourceList([], [], "work_efficiency", false)).toEqual([]);
  });

  it("filters out entries that don't match the statId", () => {
    const attrs = [
      makeEntry("a", "work_efficiency", 10),
      makeEntry("b", "quality_outcome", 5),
    ];
    const result = buildStatSourceList(attrs, [], "work_efficiency", false);
    expect(result).toHaveLength(1);
    expect(result[0].stat.stat).toBe("work_efficiency");
  });

  it("filters out entries that don't match isPercent", () => {
    const attrs = [
      makeEntry("a", "work_efficiency", 10, false),
      makeEntry("b", "work_efficiency", 5, true),
    ];
    const flatResult = buildStatSourceList(attrs, [], "work_efficiency", false);
    expect(flatResult).toHaveLength(1);
    expect(flatResult[0].stat.isPercent).toBe(false);

    const pctResult = buildStatSourceList(attrs, [], "work_efficiency", true);
    expect(pctResult).toHaveLength(1);
    expect(pctResult[0].stat.isPercent).toBe(true);
  });

  it("marks entries in effectiveAttrIds as effective=true, others as false", () => {
    const attrs = [
      makeEntry("a", "work_efficiency", 10),
      makeEntry("b", "work_efficiency", 5),
    ];
    const result = buildStatSourceList(attrs, ["a"], "work_efficiency", false);
    const byId = Object.fromEntries(
      result.map((e) => [e.item.id, e.effective]),
    );
    expect(byId["item_a"]).toBe(true);
    expect(byId["item_b"]).toBe(false);
  });

  it("sorts effective entries before non-effective", () => {
    const attrs = [
      makeEntry("inactive", "work_efficiency", 100),
      makeEntry("active", "work_efficiency", 1),
    ];
    const result = buildStatSourceList(
      attrs,
      ["active"],
      "work_efficiency",
      false,
    );
    expect(result[0].effective).toBe(true);
    expect(result[1].effective).toBe(false);
  });

  it("within same effectiveness group, sorts by descending value", () => {
    const attrs = [
      makeEntry("a", "work_efficiency", 5),
      makeEntry("b", "work_efficiency", 20),
      makeEntry("c", "work_efficiency", 10),
    ];
    // none effective
    const result = buildStatSourceList(attrs, [], "work_efficiency", false);
    expect(result.map((e) => e.stat.value)).toEqual([20, 10, 5]);
  });

  it("effective group is also sorted by descending value among themselves", () => {
    const attrs = [
      makeEntry("a", "work_efficiency", 5),
      makeEntry("b", "work_efficiency", 20),
      makeEntry("c", "work_efficiency", 10),
    ];
    const result = buildStatSourceList(
      attrs,
      ["a", "b", "c"],
      "work_efficiency",
      false,
    );
    expect(result.map((e) => e.stat.value)).toEqual([20, 10, 5]);
  });

  it("returns correct item shape on each entry", () => {
    const attrs = [makeEntry("x", "work_efficiency", 7)];
    const result = buildStatSourceList(attrs, ["x"], "work_efficiency", false);
    expect(result[0].item).toEqual({
      id: "item_x",
      name: "Item x",
      icon: "x.png",
    });
  });
});
