import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import { useCharacterImport } from "@/composables/useCharacterImport";
import type { OwnedItemEntry } from "@/domain/character/characterImport";
import fixtureData from "../fixtures/characterImport.json";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/utils/axios/db_routes", () => ({
  upsertPlayerStats: vi.fn(),
  upsertFactionReputations: vi.fn(),
  fetchPlayerStats: vi.fn(() => Promise.resolve({})),
  fetchFactionReputations: vi.fn(() => Promise.resolve({})),
  fetchOwnedItems: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/utils/axios/api_routes", () => ({
  getSkills: vi.fn(() => Promise.resolve({ data: [] })),
  getFactions: vi.fn(() => Promise.resolve({ data: [] })),
  getCategorizedItems: vi.fn(() => Promise.resolve({ data: [] })),
  getMaterials: vi.fn(() => Promise.resolve({ data: [] })),
  getFineMaterials: vi.fn(() => Promise.resolve({ data: [] })),
}));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const SKILL_IDS = [
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

/** A minimal ItemCatalogEntry map for items referenced by the fixture. */
const minimalItems: Record<string, { type: string; quality?: string; gearType?: string }> = {
  cape_of_achiever: { type: "other", quality: "common" },
  cooked_squid: { type: "consumable" },
  ring_of_homesickness: { type: "other", quality: "common" },
  soup_kitchen_badge: { type: "other", quality: "common" },
  fishing_guidebook: { type: "other", quality: "common" },
  amulet_of_the_animal_kingdom: { type: "crafted" },
  farganite_pickaxe: { type: "crafted" },
};

const emptyOwnedEntry = (): OwnedItemEntry => ({
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

/** Populates player and items stores with enough data to run the composable. */
function seedStores(
  playerStore: ReturnType<typeof usePlayerStore>,
  itemsStore: ReturnType<typeof useItemsStore>,
) {
  // Skills
  playerStore.skillLevels = Object.fromEntries(SKILL_IDS.map((id) => [id, 1]));

  // Factions map (game-side id → store reputation key)
  playerStore.factionsMap = {
    jarvonia: { reputation: "jarvonia" },
    herberts_guiding_grounds: { reputation: "herberts_guiding_grounds" },
    syrenthia: { reputation: "syrenthia" },
    trellin: { reputation: "trellin" },
    erdwise: { reputation: "erdwise" },
    halfling_rebels: { reputation: "halfling_rebels" },
  };

  playerStore.factionReputation = {
    jarvonia: 0,
    herberts_guiding_grounds: 0,
    syrenthia: 0,
    trellin: 0,
    erdwise: 0,
    halfling_rebels: 0,
  };

  playerStore.level = 1;
  playerStore.achievementPoints = 0;

  // Items
  itemsStore.allGearItems = minimalItems;
  itemsStore.ownedItems = Object.fromEntries(
    Object.keys(minimalItems).map((id) => [id, emptyOwnedEntry()]),
  );
  itemsStore.petsMap = {};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCharacterImport", () => {
  let playerStore: ReturnType<typeof usePlayerStore>;
  let itemsStore: ReturnType<typeof useItemsStore>;
  let notificationStore: ReturnType<typeof useNotificationStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    playerStore = usePlayerStore();
    itemsStore = useItemsStore();
    notificationStore = useNotificationStore();
    // Spy on notification methods
    vi.spyOn(notificationStore, "success");
    vi.spyOn(notificationStore, "error");
    seedStores(playerStore, itemsStore);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe("valid fixture import", () => {
    it("updates skill levels from the fixture", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(playerStore.skillLevels.carpentry).toBe(78);
      expect(playerStore.skillLevels.cooking).toBe(86);
      expect(playerStore.skillLevels.agility).toBe(92);
    });

    it("updates character level from the fixture", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(playerStore.level).toBe(83);
    });

    it("updates achievement points from the fixture", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(playerStore.achievementPoints).toBe(244);
    });

    it("updates faction reputations from the fixture", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(playerStore.factionReputation["jarvonia"]).toBe(198);
      expect(playerStore.factionReputation["syrenthia"]).toBe(478);
      expect(playerStore.factionReputation["halfling_rebels"]).toBe(109);
    });

    it("marks items as owned from the fixture", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(itemsStore.ownedItems["cape_of_achiever"]?.owned).toBe(true);
      expect(itemsStore.ownedItems["cooked_squid"]?.owned).toBe(true);
      expect(itemsStore.ownedItems["ring_of_homesickness"]?.owned).toBe(true);
      expect(itemsStore.ownedItems["soup_kitchen_badge"]?.owned).toBe(true);
      expect(itemsStore.ownedItems["fishing_guidebook"]?.owned).toBe(true);
    });

    it("resolves item quality correctly from the fixture", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(itemsStore.ownedItems["amulet_of_the_animal_kingdom"]?.craftedTier).toBe("rare");
      expect(itemsStore.ownedItems["farganite_pickaxe"]?.craftedTier).toBe("ethereal");
    });

    it("shows a success notification listing updated sections", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(notificationStore.success).toHaveBeenCalledOnce();
      const message = vi.mocked(notificationStore.success).mock.calls[0][0] as string;
      expect(message).toContain("Successfully updated");
    });

    it("calls upsertPlayerStats when stats change", async () => {
      const { upsertPlayerStats } = await import("@/utils/axios/db_routes");
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(upsertPlayerStats).toHaveBeenCalledOnce();
    });

    it("calls upsertFactionReputations when reputations change", async () => {
      const { upsertFactionReputations } = await import("@/utils/axios/db_routes");
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(fixtureData), false);

      expect(upsertFactionReputations).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // No-op when data is already up to date
  // -------------------------------------------------------------------------

  it("shows 'nothing to update' when imported a second time with unchanged data", () => {
    const { importCharacter } = useCharacterImport();
    // First import applies all changes
    importCharacter(JSON.stringify(fixtureData), false);
    vi.mocked(notificationStore.success).mockClear();

    // Second import finds nothing different
    importCharacter(JSON.stringify(fixtureData), false);

    expect(notificationStore.success).toHaveBeenCalledOnce();
    const message = vi.mocked(notificationStore.success).mock.calls[0][0] as string;
    expect(message).toContain("nothing to update");
  });

  // -------------------------------------------------------------------------
  // Failure / validation paths
  // -------------------------------------------------------------------------

  describe("failure paths", () => {
    it("shows an error when called with an empty string", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter("", false);

      expect(notificationStore.error).toHaveBeenCalledOnce();
      expect(notificationStore.success).not.toHaveBeenCalled();
    });

    it("shows an error for invalid JSON syntax", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter("{not valid json}", false);

      expect(notificationStore.error).toHaveBeenCalledOnce();
      expect(notificationStore.success).not.toHaveBeenCalled();
    });

    it("shows an error when JSON root is an array instead of an object", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify([1, 2, 3]), false);

      expect(notificationStore.error).toHaveBeenCalledOnce();
      expect(notificationStore.success).not.toHaveBeenCalled();
    });

    it("shows an error when JSON root is a primitive", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify("just a string"), false);

      expect(notificationStore.error).toHaveBeenCalledOnce();
      expect(notificationStore.success).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Partial / sparse data
  // -------------------------------------------------------------------------

  describe("partial data", () => {
    it("only updates skills when only skills section is present", () => {
      const partial = { skills: fixtureData.skills };
      const setCharacterLevelSpy = vi.spyOn(playerStore, "setCharacterLevel");

      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(partial), false);

      expect(playerStore.skillLevels.agility).toBe(92);
      expect(setCharacterLevelSpy).not.toHaveBeenCalled();
      expect(notificationStore.success).toHaveBeenCalledOnce();
    });

    it("does not update skills when skills section is absent", () => {
      const { steps, achievement_points, reputation } = fixtureData;
      const partial = { steps, achievement_points, reputation };

      const setSkillLevelsSpy = vi.spyOn(playerStore, "setSkillLevels");

      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(partial), false);

      expect(setSkillLevelsSpy).not.toHaveBeenCalled();
    });

    it("handles a completely empty object gracefully", () => {
      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify({}), false);

      // Nothing changed, so success with "nothing to update"
      expect(notificationStore.success).toHaveBeenCalledOnce();
      const message = vi.mocked(notificationStore.success).mock.calls[0][0] as string;
      expect(message).toContain("nothing to update");
      expect(notificationStore.error).not.toHaveBeenCalled();
    });

    it("ignores unknown skills not present in the store", () => {
      const partial = {
        skills: {
          agility: fixtureData.skills.agility,
          completely_made_up_skill: 9999999,
        },
      };

      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(partial), false);

      expect(playerStore.skillLevels.agility).toBe(92);
      expect(playerStore.skillLevels).not.toHaveProperty("completely_made_up_skill");
    });

    it("ignores unknown factions not present in the factions map", () => {
      const partial = {
        reputation: {
          jarvonia: fixtureData.reputation.jarvonia,
          made_up_faction: 1000,
        },
      };

      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(partial), false);

      expect(playerStore.factionReputation["jarvonia"]).toBe(198);
      expect(playerStore.factionReputation).not.toHaveProperty("made_up_faction");
    });

    it("ignores items not present in the item catalog", () => {
      const partial = {
        bank: { cape_of_achiever: 1, completely_made_up_item: 1 },
      };

      const { importCharacter } = useCharacterImport();
      importCharacter(JSON.stringify(partial), false);

      expect(itemsStore.ownedItems["cape_of_achiever"]?.owned).toBe(true);
      expect(itemsStore.ownedItems).not.toHaveProperty("completely_made_up_item");
    });
  });
});
