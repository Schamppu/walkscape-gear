import { describe, it, expect } from "vitest";
import {
  parseCharacterLevel,
  parseSkillLevels,
  parseFactionReputations,
  parseOwnedItems,
  type ItemCatalogEntry,
  type OwnedItemEntry,
  type FactionMapEntry,
} from "@/domain/character/characterImport";
import fixtureData from "../../fixtures/characterImport.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an empty owned-item entry used as current state when none is needed. */
const emptyEntry = (): OwnedItemEntry => ({
  owned: false,
  hidden: false,
  quantity: 0,
  craftedTier: null,
  craftedTier2: null,
  consumableCommon: false,
  consumableFine: false,
  petLevel: null,
  petRarity: null,
});

/**
 * Minimal factions map that maps each game-side faction id found in the
 * fixture straight to a matching reputation key so assertions remain readable.
 *
 * In production the reputation key is usually a camelCase variant, but the
 * domain only cares that the map entry has a `reputation` string.
 */
const fixtureFactionsMap: Record<string, FactionMapEntry> = {
  jarvonia: { reputation: "jarvonia" },
  herberts_guiding_grounds: { reputation: "herberts_guiding_grounds" },
  syrenthia: { reputation: "syrenthia" },
  trellin: { reputation: "trellin" },
  erdwise: { reputation: "erdwise" },
  halfling_rebels: { reputation: "halfling_rebels" },
};

// ---------------------------------------------------------------------------
// Skill levels
// ---------------------------------------------------------------------------

describe("Character Import Functionality", () => {
  it("should correctly import character skill levels from a save file", () => {
    const knownSkillIds = [
      "agility",
      "carpentry",
      "cooking",
      "crafting",
      "fishing",
      "foraging",
      "mining",
      "smithing",
      "trinketry",
      "woodcutting",
    ];

    const result = parseSkillLevels(fixtureData.skills, knownSkillIds);

    expect(result.carpentry).toBe(78);
    expect(result.cooking).toBe(86);
    expect(result.crafting).toBe(76);
    expect(result.smithing).toBe(77);
    expect(result.trinketry).toBe(77);
    expect(result.fishing).toBe(81);
    expect(result.foraging).toBe(84);
    expect(result.mining).toBe(86);
    expect(result.woodcutting).toBe(84);
    expect(result.agility).toBe(92);
  });

  // -------------------------------------------------------------------------
  // Character level
  // -------------------------------------------------------------------------

  it("should correctly import character level from a save file", () => {
    const level = parseCharacterLevel(fixtureData.steps);
    expect(level).toBe(83);
  });

  // -------------------------------------------------------------------------
  // Faction reputations
  // -------------------------------------------------------------------------

  it("should correctly import faction reputations from a save file", () => {
    const result = parseFactionReputations(
      fixtureData.reputation,
      fixtureFactionsMap,
    );

    expect(result["jarvonia"]).toBe(198);
    expect(result["herberts_guiding_grounds"]).toBe(5);
    expect(result["syrenthia"]).toBe(478);
    expect(result["trellin"]).toBe(312);
    expect(result["erdwise"]).toBe(331);
    expect(result["halfling_rebels"]).toBe(109);
  });

  // -------------------------------------------------------------------------
  // Owned items - presence
  // -------------------------------------------------------------------------

  it("should correctly import owned items from a save file", () => {
    /**
     * Minimal catalog covering only the items needed for this test.
     * Item types:
     *   - "collectible" treated as "other" → owned=true with item's own quality
     *   - "crafted" → quality resolved from suffix
     */
    const knownItems: Record<string, ItemCatalogEntry> = {
      cape_of_achiever: { type: "other", quality: "common" },
      cooked_squid: { type: "consumable" },
      ring_of_homesickness: { type: "other", quality: "common" },
      soup_kitchen_badge: { type: "other", quality: "common" },
      fishing_guidebook: { type: "other", quality: "common" },
    };

    const currentOwned: Record<string, OwnedItemEntry> = {
      cape_of_achiever: emptyEntry(),
      cooked_squid: emptyEntry(),
      ring_of_homesickness: emptyEntry(),
      soup_kitchen_badge: emptyEntry(),
      fishing_guidebook: emptyEntry(),
    };

    const result = parseOwnedItems(
      fixtureData,
      knownItems,
      currentOwned,
      {},
      false,
    );

    // cape_of_achiever - equipped in gear slot "cape"
    expect(result["cape_of_achiever"]?.owned).toBe(true);

    // cooked_squid - listed in consumables
    expect(result["cooked_squid"]?.owned).toBe(true);

    // ring_of_homesickness - listed in inventory
    expect(result["ring_of_homesickness"]?.owned).toBe(true);

    // soup_kitchen_badge - present in collectibles array
    expect(result["soup_kitchen_badge"]?.owned).toBe(true);

    // fishing_guidebook - present in bank
    expect(result["fishing_guidebook"]?.owned).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Owned items - quality determination
  // -------------------------------------------------------------------------

  it("should correctly determine quality of certain owned items", () => {
    const knownItems: Record<string, ItemCatalogEntry> = {
      amulet_of_the_animal_kingdom: { type: "crafted" },
      farganite_pickaxe: { type: "crafted" },
    };

    const currentOwned: Record<string, OwnedItemEntry> = {
      amulet_of_the_animal_kingdom: emptyEntry(),
      farganite_pickaxe: emptyEntry(),
    };

    const result = parseOwnedItems(
      fixtureData,
      knownItems,
      currentOwned,
      {},
      false,
    );

    // amulet_of_the_animal_kingdom_rare is in gear → craftedTier should be "rare"
    expect(result["amulet_of_the_animal_kingdom"]?.craftedTier).toBe("rare");

    // farganite_pickaxe_ethereal is in bank → craftedTier should be "ethereal"
    expect(result["farganite_pickaxe"]?.craftedTier).toBe("ethereal");
  });

  it("should reset owned status of items not present in the import when reset=true", () => {
    const knownItems: Record<string, ItemCatalogEntry> = {
      cape_of_achiever: { type: "other", quality: "common" },
      cooked_squid: { type: "consumable", owned: true },
      ring_of_homesickness: { type: "other", quality: "common" },
      artificial_snowflake: { type: "collectible", quality: "common" },
    };

    const currentOwned: Record<string, OwnedItemEntry> = {
      artificial_snowflake: {
        ...emptyEntry(),
        owned: true,
      },
    };

    const result = parseOwnedItems(fixtureData, knownItems, currentOwned, {}, true);
    expect(result["artificial_snowflake"]?.owned).toBe(false);
  });

  it("should not reset hidden status of owned items even with reset=true", () => {
    const knownItems: Record<string, ItemCatalogEntry> = {
      cape_of_achiever: { type: "other", quality: "common" },
      cooked_squid: { type: "consumable", owned: true },
      ring_of_homesickness: { type: "other", quality: "common" },
      artificial_snowflake: { type: "collectible", quality: "common" },
    };

    const currentOwned: Record<string, OwnedItemEntry> = {
      artificial_snowflake: {
        ...emptyEntry(),
        owned: true,
        hidden: true,
      },
    };

    const result = parseOwnedItems(fixtureData, knownItems, currentOwned, {}, true);
    expect(result["artificial_snowflake"]?.hidden).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Pets
  // -------------------------------------------------------------------------

  /**
   * petsMap covering every species that appears in the fixture.
   * The value is irrelevant for the domain logic – only key presence is tested.
   */
  const fixturePetsMap: Record<string, unknown> = {
    reindeer: {},
    chicken: {},
    camel: {},
    dolphin: {},
    tortoise: {},
    tiger: {},
  };

  it("should parse pets from pets.pet and pets.egg sections", () => {
    const currentOwned: Record<string, OwnedItemEntry> = {
      reindeer: emptyEntry(),
      chicken: emptyEntry(),
    };

    const result = parseOwnedItems(fixtureData, {}, currentOwned, fixturePetsMap, false);

    // pets.pet: reindeer level=3, species is single word → common
    expect(result["reindeer"]?.owned).toBe(true);
    expect(result["reindeer"]?.petLevel).toBe(3);
    expect(result["reindeer"]?.petRarity).toBe("common");

    // pets.egg: lovestruck_chicken level=0, variant species → rare; baseId=chicken
    // available_pets also has chicken level=4 common which should win by level
    expect(result["chicken"]?.owned).toBe(true);
  });

  it("should parse pets from available_pets and available_eggs", () => {
    const currentOwned: Record<string, OwnedItemEntry> = {
      camel: emptyEntry(),
      tiger: emptyEntry(),
    };

    const result = parseOwnedItems(fixtureData, {}, currentOwned, fixturePetsMap, false);

    // camel: available_pets level=2, common
    expect(result["camel"]?.owned).toBe(true);
    expect(result["camel"]?.petLevel).toBe(2);
    expect(result["camel"]?.petRarity).toBe("common");

    // tiger: available_eggs level=0, common
    expect(result["tiger"]?.owned).toBe(true);
    expect(result["tiger"]?.petLevel).toBe(0);
    expect(result["tiger"]?.petRarity).toBe("common");
  });

  it("should keep only the highest-level instance when duplicates exist", () => {
    const currentOwned: Record<string, OwnedItemEntry> = {
      dolphin: emptyEntry(),
    };

    // Fixture has two dolphins: level=2 and level=3 (both common)
    const result = parseOwnedItems(fixtureData, {}, currentOwned, fixturePetsMap, false);

    expect(result["dolphin"]?.petLevel).toBe(3);
    expect(result["dolphin"]?.petRarity).toBe("common");
  });

  it("should detect rare quality for variant species (prefix_species pattern)", () => {
    const currentOwned: Record<string, OwnedItemEntry> = {
      tortoise: emptyEntry(),
      chicken: emptyEntry(),
    };

    // precious_tortoise (level=4, rare) beats tortoise (level=1, common)
    const result = parseOwnedItems(fixtureData, {}, currentOwned, fixturePetsMap, false);
    expect(result["tortoise"]?.petLevel).toBe(4);
    expect(result["tortoise"]?.petRarity).toBe("rare");

    // chicken (level=4, common) beats lovestruck_chicken (level=0, rare)
    expect(result["chicken"]?.petLevel).toBe(4);
    expect(result["chicken"]?.petRarity).toBe("common");
  });

  it("should prefer the highest level across different sources (cross-source priority)", () => {
    const currentOwned: Record<string, OwnedItemEntry> = {
      reindeer: emptyEntry(),
    };

    // reindeer: pets.pet level=3 vs available_eggs level=0 → level=3 wins
    const result = parseOwnedItems(fixtureData, {}, currentOwned, fixturePetsMap, false);
    expect(result["reindeer"]?.petLevel).toBe(3);
  });

  it("should skip pet species not present in petsMap", () => {
    // Empty petsMap – no pets should be written to result
    const currentOwned: Record<string, OwnedItemEntry> = {};
    const result = parseOwnedItems(fixtureData, {}, currentOwned, {}, false);

    expect(result["reindeer"]).toBeUndefined();
    expect(result["chicken"]).toBeUndefined();
    expect(result["dolphin"]).toBeUndefined();
  });

  it("should preserve hidden flag for pets when reset=true", () => {
    const currentOwned: Record<string, OwnedItemEntry> = {
      reindeer: { ...emptyEntry(), owned: true, hidden: true, petLevel: 1, petRarity: "common" },
    };

    const result = parseOwnedItems(fixtureData, {}, currentOwned, fixturePetsMap, true);
    // reindeer is in fixture pets.pet at level=3, so it should be re-owned
    expect(result["reindeer"]?.owned).toBe(true);
    expect(result["reindeer"]?.hidden).toBe(true);
  });
});
