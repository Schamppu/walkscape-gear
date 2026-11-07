import { describe, it, expect } from "vitest";
import { makePseudoStat } from "@/domain/gear/pseudoStat";
import type { Attribute, Stat } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStat(overrides: Partial<Stat> = {}): Stat {
  return {
    stat: "roll_special_table",
    name: "Roll special table",
    type: "rollSpecialTable",
    isPercent: true,
    value: 0.0025,
    isNegative: false,
    isMultiplicative: true,
    ...overrides,
  };
}

function makeAttr(overrides: Partial<Attribute> = {}): Attribute {
  return {
    id: "attr-1",
    customIcon: null,
    customTextLocalizationKey:
      "attributes.singulars.custom.findTreasureChest.text",
    customText: 'Chance to find <hl>1</hl> <object id="skilling_chest" />',
    textLocalizationKey: "attributes.singulars.custom.findTreasureChest.text",
    text: 'Chance to find <hl>1</hl> <object id="skilling_chest" />',
    statText: "Roll special table",
    skillText: "",
    tables: [
      {
        isPrimary: false,
        type: [],
        rollAmount: 1,
        tables: ["find_basic_chests"],
      },
    ],
    requirements: [],
    stats: [makeStat()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// makePseudoStat
// ---------------------------------------------------------------------------

describe("makePseudoStat", () => {
  it("sets statText to the stripped customText", () => {
    const attr = makeAttr();
    // TODO fix implementation to use WsText logic.
    // Should be "Chance to find 1 Skilling Chest" instead of "Chance to find 1 "
    expect(makePseudoStat(attr).statText).toBe("Chance to find 1 ");
  });

  it("strips HTML tags from customText when setting statText", () => {
    const attr = makeAttr({ customText: "<b>Healing Boost</b>" });
    expect(makePseudoStat(attr).statText).toBe("Healing Boost");
  });

  it("sets stats[0].name to the stripped customText", () => {
    const attr = makeAttr({ customText: "Speed Boost" });
    expect(makePseudoStat(attr).stats[0].name).toBe("Speed Boost");
  });

  it("extracts stat key from the second-to-last dot segment of customTextLocalizationKey", () => {
    const attr = makeAttr({
      customTextLocalizationKey: "item.abilities.myPseudoStat.description",
    });
    const result = makePseudoStat(attr);
    expect(result.stats[0].stat).toBe("myPseudoStat");
    expect(result.stats[0].type).toBe("myPseudoStat");
  });

  it("handles a minimal two-segment localization key", () => {
    const attr = makeAttr({ customTextLocalizationKey: "category.stat" });
    expect(makePseudoStat(attr).stats[0].stat).toBe("category");
  });

  it("preserves all other attribute fields unchanged", () => {
    const attr = makeAttr({ id: "special-id", skillText: "mySkill" });
    const result = makePseudoStat(attr);
    expect(result.id).toBe("special-id");
    expect(result.skillText).toBe("mySkill");
    expect(result.text).toBe(attr.text);
    expect(result.requirements).toBe(attr.requirements);
  });

  it("preserves non-name stat fields (value, isPercent, etc.)", () => {
    const stat = makeStat({
      isPercent: true,
      value: 42,
      isMultiplicative: true,
      isNegative: false,
    });
    const attr = makeAttr({ stats: [stat] });
    const result = makePseudoStat(attr);
    expect(result.stats[0].isPercent).toBe(true);
    expect(result.stats[0].value).toBe(42);
    expect(result.stats[0].isMultiplicative).toBe(true);
  });

  it("always returns exactly one stat in the stats array", () => {
    const attr = makeAttr();
    expect(makePseudoStat(attr).stats).toHaveLength(1);
  });
});
