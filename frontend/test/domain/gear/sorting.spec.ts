import { describe, it, expect } from "vitest";
import {
  itemQualityNameSort,
  levelReqNameSort,
} from "@/domain/gear/sorting";
import type { ItemDetail } from "@/domain/types/item";
import type { SkillLevelRequirement } from "@/domain/types/requirement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(
  name: string,
  quality: string,
  requirements: SkillLevelRequirement[] = [],
): ItemDetail {
  return { name, quality, requirements } as unknown as ItemDetail;
}

function skillLevel(skill: string, level: number): SkillLevelRequirement {
  return {
    type: "skillLevel",
    name: null,
    opposite: false,
    requirement: { skill, level },
  };
}

function sortByQuality(items: ItemDetail[], reverse = false) {
  return [...items]
    .sort((a, b) => itemQualityNameSort(a, b, reverse))
    .map((i) => i.name);
}

function sortByLevel(items: ItemDetail[], reverse = false) {
  return [...items]
    .sort((a, b) => levelReqNameSort(a, b, reverse))
    .map((i) => i.name);
}

// Quality order: common < uncommon < rare < epic < legendary < ethereal

// ---------------------------------------------------------------------------
// itemQualityNameSort
// ---------------------------------------------------------------------------

describe("itemQualityNameSort", () => {
  it("sorts full quality range low-to-high", () => {
    const items = [
      makeItem("Ethereal", "ethereal"),
      makeItem("Common", "common"),
      makeItem("Epic", "epic"),
      makeItem("Uncommon", "uncommon"),
      makeItem("Legendary", "legendary"),
      makeItem("Rare", "rare"),
    ];
    expect(sortByQuality(items)).toEqual([
      "Common",
      "Uncommon",
      "Rare",
      "Epic",
      "Legendary",
      "Ethereal",
    ]);
  });

  it("with reverseQuality=true, sorts high-to-low", () => {
    const items = [
      makeItem("Common", "common"),
      makeItem("Rare", "rare"),
      makeItem("Ethereal", "ethereal"),
    ];
    expect(sortByQuality(items, true)).toEqual(["Ethereal", "Rare", "Common"]);
  });

  it("falls back to name sort when quality is equal", () => {
    const items = [
      makeItem("Sword", "rare"),
      makeItem("Axe", "rare"),
      makeItem("Mace", "rare"),
    ];
    expect(sortByQuality(items)).toEqual(["Axe", "Mace", "Sword"]);
  });

  it("returns 0 for identical name and quality", () => {
    const item = makeItem("Sword", "epic");
    expect(itemQualityNameSort(item, item)).toBe(0);
  });

  it("unknown quality sorts after all known qualities", () => {
    const items = [
      makeItem("Unknown", "unknown_quality"),
      makeItem("Common", "common"),
      makeItem("Ethereal", "ethereal"),
    ];
    expect(sortByQuality(items)).toEqual(["Common", "Ethereal", "Unknown"]);
  });
});

// ---------------------------------------------------------------------------
// levelReqNameSort
// ---------------------------------------------------------------------------

describe("levelReqNameSort", () => {
  it("sorts items by level requirement low-to-high", () => {
    const items = [
      makeItem("High", "common", [skillLevel("fishing", 50)]),
      makeItem("Low", "common", [skillLevel("fishing", 10)]),
      makeItem("Mid", "common", [skillLevel("fishing", 30)]),
    ];
    expect(sortByLevel(items)).toEqual(["Low", "Mid", "High"]);
  });

  it("with reverse=true, sorts high-to-low", () => {
    const items = [
      makeItem("High", "common", [skillLevel("fishing", 50)]),
      makeItem("Low", "common", [skillLevel("fishing", 10)]),
      makeItem("Mid", "common", [skillLevel("fishing", 30)]),
    ];
    expect(sortByLevel(items, true)).toEqual(["High", "Mid", "Low"]);
  });

  it("item with no requirements sorts before items with requirements", () => {
    const items = [
      makeItem("HasReq", "common", [skillLevel("mining", 30)]),
      makeItem("NoReq", "common"),
    ];
    expect(sortByLevel(items)).toEqual(["NoReq", "HasReq"]);
  });

  it("uses the highest skill level when multiple requirements exist", () => {
    const items = [
      makeItem("Multi", "common", [skillLevel("fishing", 10), skillLevel("mining", 40)]),
      makeItem("Single35", "common", [skillLevel("crafting", 35)]),
      makeItem("Single20", "common", [skillLevel("agility", 20)]),
    ];
    // effective levels: Multi=40, Single35=35, Single20=20
    expect(sortByLevel(items)).toEqual(["Single20", "Single35", "Multi"]);
  });

  it("falls back to name sort when level requirements are equal", () => {
    const items = [
      makeItem("Sword", "common", [skillLevel("fishing", 20)]),
      makeItem("Axe", "common", [skillLevel("fishing", 20)]),
      makeItem("Mace", "common", [skillLevel("fishing", 20)]),
    ];
    expect(sortByLevel(items)).toEqual(["Axe", "Mace", "Sword"]);
  });

  it("returns 0 for identical name and level requirement", () => {
    const item = makeItem("Sword", "common", [skillLevel("smithing", 25)]);
    expect(levelReqNameSort(item, item)).toBe(0);
  });

  it("ignores non-skillLevel requirements (treats item as level 0)", () => {
    const withNonSkill = {
      name: "Forest",
      quality: "common",
      requirements: [
        {
          type: "locationHasKeywords" as const,
          name: null,
          opposite: false,
          requirement: { keywords: ["forest"] },
        },
      ],
    } as unknown as ItemDetail;
    const withSkill = makeItem("Skilled", "common", [skillLevel("fishing", 20)]);
    const items = [withSkill, withNonSkill];
    expect(sortByLevel(items)).toEqual(["Forest", "Skilled"]);
  });
});
