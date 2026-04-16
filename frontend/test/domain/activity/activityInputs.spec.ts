import { describe, it, expect } from "vitest";
import { resolveActivityInputs } from "@/domain/activity/activityInputs";
import type {
  ActivityInputLookups,
  MaterialRef,
} from "@/domain/activity/activityInputs";
import type { ActivityOption } from "@/domain/types/activity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLookups(
  overrides: Partial<ActivityInputLookups> = {},
): ActivityInputLookups {
  return {
    getKeyword: (id) =>
      id === "wood"
        ? { name: "Wood", icon: "icons/wood.png" }
        : id === "ore"
          ? { name: "Ore", icon: "icons/ore.png" }
          : null,
    materialsById: {
      oak_log: {
        id: "oak_log",
        name: "Oak Log",
        icon: "icons/oak.png",
        keywords: ["wood"],
      },
      pine_log: {
        id: "pine_log",
        name: "Pine Log",
        icon: "icons/pine.png",
        keywords: ["wood"],
      },
      iron_ore: {
        id: "iron_ore",
        name: "Iron Ore",
        icon: "icons/iron.png",
        keywords: ["ore"],
      },
    } as Record<string, MaterialRef>,
    fineMaterialIds: { oak_log: true },
    ...overrides,
  };
}

function keywordOption(keyword: string): ActivityOption {
  return {
    type: "inputActivity",
    inputs: [{ type: "keyword", keyword }],
    enableAttributes: false,
    enableTierBenefit: false,
    enableQualityBenefit: false,
    enableFineBenefit: false,
    requireFine: false,
  };
}

function specificOption(item: string, quantity = 1): ActivityOption {
  return {
    type: "inputActivity",
    inputs: [
      {
        type: "specific",
        item,
        quantity,
        quality: null,
        isOptional: false,
      },
    ],
    enableAttributes: false,
    enableTierBenefit: false,
    enableQualityBenefit: false,
    enableFineBenefit: false,
    requireFine: false,
  };
}

// ---------------------------------------------------------------------------
// Edge cases — null / empty options
// ---------------------------------------------------------------------------

describe("resolveActivityInputs — edge cases", () => {
  it("returns [] for null options", () => {
    expect(resolveActivityInputs(null, makeLookups())).toEqual([]);
  });

  it("returns [] for undefined options", () => {
    expect(resolveActivityInputs(undefined, makeLookups())).toEqual([]);
  });

  it("returns [] for an empty options array", () => {
    expect(resolveActivityInputs([], makeLookups())).toEqual([]);
  });

  it("ignores non-inputActivity option types", () => {
    const options: ActivityOption[] = [
      { type: "limitedActivity", maxCompletions: 5 },
    ];
    expect(resolveActivityInputs(options, makeLookups())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Keyword inputs
// ---------------------------------------------------------------------------

describe("resolveActivityInputs — keyword inputs", () => {
  it("resolves keyword name and icon from the lookup", () => {
    const options = [keywordOption("wood")];
    const [result] = resolveActivityInputs(options, makeLookups());
    expect(result.name).toBe("Wood");
    expect(result.icon).toBe("icons/wood.png");
  });

  it("sets quantity to undefined for keyword inputs", () => {
    const options = [keywordOption("wood")];
    const [result] = resolveActivityInputs(options, makeLookups());
    expect(result.quantity).toBeUndefined();
  });

  it("skips keyword input when keyword is not found in the lookup", () => {
    const options = [keywordOption("unknown_kw")];
    expect(resolveActivityInputs(options, makeLookups())).toHaveLength(0);
  });

  it("canBeFine is true when ALL keyword materials are fine", () => {
    // oak_log and pine_log both have "wood"; only oak_log is fine → not all fine
    const options = [keywordOption("wood")];
    const result = resolveActivityInputs(options, makeLookups());
    expect(result[0].canBeFine).toBe(false);
  });

  it("canBeFine is true when ALL keyword materials are in fineMaterialIds", () => {
    const options = [keywordOption("wood")];
    const lookups = makeLookups({
      fineMaterialIds: { oak_log: true, pine_log: true },
    });
    const result = resolveActivityInputs(options, lookups);
    expect(result[0].canBeFine).toBe(true);
  });

  it("canBeFine is false when no materials carry the keyword", () => {
    const options = [keywordOption("ore")];
    const lookups = makeLookups({ materialsById: {} });
    const result = resolveActivityInputs(options, lookups);
    expect(result[0].canBeFine).toBe(false);
  });

  it("canBeFine is false when at least one keyword material is not fine", () => {
    const options = [keywordOption("wood")];
    const lookups = makeLookups({ fineMaterialIds: {} });
    const result = resolveActivityInputs(options, lookups);
    expect(result[0].canBeFine).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Specific inputs
// ---------------------------------------------------------------------------

describe("resolveActivityInputs — specific inputs", () => {
  it("resolves specific item name and icon from materialsById", () => {
    const options = [specificOption("oak_log")];
    const [result] = resolveActivityInputs(options, makeLookups());
    expect(result.name).toBe("Oak Log");
    expect(result.icon).toBe("icons/oak.png");
  });

  it("preserves the quantity from the input", () => {
    const options = [specificOption("oak_log", 5)];
    const [result] = resolveActivityInputs(options, makeLookups());
    expect(result.quantity).toBe(5);
  });

  it("skips specific input when item is not in materialsById", () => {
    const options = [specificOption("missing_item")];
    expect(resolveActivityInputs(options, makeLookups())).toHaveLength(0);
  });

  it("canBeFine is true when the specific item is in fineMaterialIds", () => {
    const options = [specificOption("oak_log")];
    const [result] = resolveActivityInputs(options, makeLookups());
    expect(result.canBeFine).toBe(true);
  });

  it("canBeFine is false when the specific item is not in fineMaterialIds", () => {
    const options = [specificOption("pine_log")];
    const [result] = resolveActivityInputs(options, makeLookups());
    expect(result.canBeFine).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multiple options and mixed inputs
// ---------------------------------------------------------------------------

describe("resolveActivityInputs — multiple inputs", () => {
  it("flattens inputs from multiple options into a single array", () => {
    const options = [keywordOption("wood"), specificOption("iron_ore")];
    expect(resolveActivityInputs(options, makeLookups())).toHaveLength(2);
  });

  it("handles an option with multiple inputs", () => {
    const option: ActivityOption = {
      type: "inputActivity",
      inputs: [
        { type: "keyword", keyword: "wood" },
        { type: "specific", item: "iron_ore", quantity: 2, quality: null, isOptional: false },
      ],
      enableAttributes: false,
      enableTierBenefit: false,
      enableQualityBenefit: false,
      enableFineBenefit: false,
      requireFine: false,
    };
    expect(resolveActivityInputs([option], makeLookups())).toHaveLength(2);
  });

  it("skips unrecognised input types", () => {
    const option: ActivityOption = {
      type: "inputActivity",
      // @ts-expect-error — intentionally testing unknown type
      inputs: [{ type: "unknown" }],
      enableAttributes: false,
      enableTierBenefit: false,
      enableQualityBenefit: false,
      enableFineBenefit: false,
      requireFine: false,
    };
    expect(resolveActivityInputs([option], makeLookups())).toHaveLength(0);
  });
});
