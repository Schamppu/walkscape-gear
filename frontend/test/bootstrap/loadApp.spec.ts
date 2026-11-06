import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StaticBootstrap, UserBootstrap } from "@/domain/types/bootstrap";

vi.mock("@/utils/axios/api_routes", () => ({ getStaticBootstrap: vi.fn() }));
vi.mock("@/utils/axios/db_routes", () => ({ getUserBootstrap: vi.fn() }));

const notifications = { error: vi.fn(), success: vi.fn(), debug: vi.fn() };
vi.mock("@/store/notifications", () => ({ useNotificationStore: () => notifications }));

const staticBundle = {
  version: "v1",
  activities: [],
  recipes: [],
  abilities: [],
  keywords: [],
  stats: [],
  lootTables: [],
  locations: [],
  factions: [
    { id: "jarvonia", name: "Jarvonia", icon: "", color: "", reputation: "jarvoniaReputation" },
  ],
  globalVariables: [],
  itemValueMapping: {},
  skills: [{ id: "agility", name: "Agility", icon: "", type: "", typeIcon: "" }],
  urlMapping: {},
  categorizedItems: [{ categories: [{ key: "pets", items: [] }] }],
  materials: [],
  containers: [],
  memospheres: [],
  fineMaterials: [],
  routes: [],
  terrainModifiers: [],
  gearSetTags: [{ id: "skilling", name: "Skilling" }],
} as unknown as StaticBootstrap;

const userBundle = {
  userStats: { agility: 50 },
  ownedItems: [{ itemId: "ring", owned: true }],
  factionReputations: { jarvoniaReputation: 120 },
  gearSets: [{ id: 1, name: "Set", tags: ["skilling"] }],
  userSettings: {},
} as unknown as UserBootstrap;

let loadApp: typeof import("@/bootstrap/loadApp");
let api: typeof import("@/utils/axios/api_routes");
let db: typeof import("@/utils/axios/db_routes");
let stores: {
  player: typeof import("@/store/player");
  items: typeof import("@/store/items");
  gearSet: typeof import("@/store/gearSet");
  settings: typeof import("@/store/settings");
};

describe("loadApp", () => {
  beforeEach(async () => {
    // loadApp memoizes the static load at module level; start each test fresh.
    vi.resetModules();
    vi.clearAllMocks();
    const { setActivePinia, createPinia } = await import("pinia");
    setActivePinia(createPinia());

    loadApp = await import("@/bootstrap/loadApp");
    api = await import("@/utils/axios/api_routes");
    db = await import("@/utils/axios/db_routes");
    stores = {
      player: await import("@/store/player"),
      items: await import("@/store/items"),
      gearSet: await import("@/store/gearSet"),
      settings: await import("@/store/settings"),
    };

    vi.mocked(api.getStaticBootstrap).mockResolvedValue({ data: staticBundle } as never);
    vi.mocked(db.getUserBootstrap).mockResolvedValue(userBundle);
  });

  it("hydrates static and user data into the stores", async () => {
    await Promise.all([loadApp.loadStatic(), loadApp.loadUser()]);

    const player = stores.player.usePlayerStore();
    expect(player.skillLevels).toEqual({ agility: 50 });
    expect(player.factionReputation).toEqual({ jarvoniaReputation: 120 });
    expect(stores.items.useItemsStore().ownedItems).toHaveProperty("ring");
    const gearSet = stores.gearSet.useGearSetStore();
    expect(gearSet.gearSets[0].tags).toEqual([{ id: "skilling", name: "Skilling" }]);
    expect(stores.settings.useSettingsStore().isLoaded).toBe(true);
  });

  it("fetches static data once and refetches only the user bundle on reload", async () => {
    await Promise.all([loadApp.loadStatic(), loadApp.loadUser()]);
    vi.mocked(db.getUserBootstrap).mockResolvedValue({
      ...userBundle,
      gearSets: [],
    });

    await Promise.all([loadApp.loadStatic(), loadApp.loadUser()]);

    expect(api.getStaticBootstrap).toHaveBeenCalledTimes(1);
    expect(db.getUserBootstrap).toHaveBeenCalledTimes(2);
    expect(stores.gearSet.useGearSetStore().gearSets).toEqual([]);
  });

  it("falls back to empty user data and notifies when the user bundle fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.getUserBootstrap).mockRejectedValue(new Error("down"));

    await loadApp.loadUser();

    expect(notifications.error).toHaveBeenCalledWith("Failed to load your saved data");
    expect(stores.player.usePlayerStore().skillLevels).toEqual({ agility: 1 });
    expect(stores.settings.useSettingsStore().isLoaded).toBe(true);
  });

  it("retries the static load after a failure", async () => {
    vi.mocked(api.getStaticBootstrap).mockRejectedValueOnce(new Error("down"));

    await expect(loadApp.loadStatic()).rejects.toThrow("down");
    await loadApp.loadStatic();

    expect(api.getStaticBootstrap).toHaveBeenCalledTimes(2);
  });
});
