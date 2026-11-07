import { describe, it, expect } from "vitest";
import { getPetIcon } from "@/domain/pets/getPetIcon";
import type { PetItem } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Minimal pet fixture (two stages: juvenile at level 1, adult at level 2)
// ---------------------------------------------------------------------------

const pet: PetItem = {
  egg: {
    name: "Test Egg",
    desc: "An egg.",
    sprite: "egg.png",
    sheet: "egg_sheet.png",
  },
  looks: [
    {
      id: "default",
      sprites: [
        { sprite: "baby.png", sheet: "baby_sheet.png", stage: "juvenile" },
        { sprite: "adult.png", sheet: "adult_sheet.png", stage: "adult" },
      ],
    },
  ],
  rareLooks: [
    {
      id: "default",
      sprites: [
        {
          sprite: "baby_shiny.png",
          sheet: "baby_shiny_sheet.png",
          stage: "juvenile",
        },
        {
          sprite: "adult_shiny.png",
          sheet: "adult_shiny_sheet.png",
          stage: "adult",
        },
      ],
    },
  ],
  levels: [
    { level: 1, xp: 0, stage: "juvenile", attributes: [] },
    { level: 2, xp: 50000, stage: "adult", attributes: [] },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getPetIcon", () => {
  it("returns the egg sprite when level is 0", () => {
    expect(getPetIcon(pet, 0)).toBe("egg.png");
  });

  it("returns the egg sprite for string '0'", () => {
    expect(getPetIcon(pet, "0")).toBe("egg.png");
  });

  it("returns the juvenile sprite at level 1 (default look)", () => {
    expect(getPetIcon(pet, 1)).toBe("baby.png");
  });

  it("returns the adult sprite at level 2 (default look)", () => {
    expect(getPetIcon(pet, 2)).toBe("adult.png");
  });

  it("accepts level as a string number", () => {
    expect(getPetIcon(pet, "1")).toBe("baby.png");
    expect(getPetIcon(pet, "2")).toBe("adult.png");
  });

  it("returns the rare juvenile sprite when isRare is true at level 1", () => {
    expect(getPetIcon(pet, 1, true)).toBe("baby_shiny.png");
  });

  it("returns the rare adult sprite when isRare is true at level 2", () => {
    expect(getPetIcon(pet, 2, true)).toBe("adult_shiny.png");
  });

  it("defaults isRare to false (same as explicit false)", () => {
    expect(getPetIcon(pet, 1)).toBe(getPetIcon(pet, 1, false));
  });
});
