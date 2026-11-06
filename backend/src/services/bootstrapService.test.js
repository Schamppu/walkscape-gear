import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
const service = vi.hoisted(() => () => ({ list }));

vi.mock("./index.js", () => ({
  abilitiesService: service(),
  activityService: service(),
  factionService: service(),
  globalVariableService: service(),
  keywordService: service(),
  locationService: service(),
  lootTableService: service(),
  recipeService: service(),
  routeService: service(),
  skillService: service(),
  statService: service(),
  terrainModifierService: service(),
  itemService: {
    getItemValueMapping: vi.fn(async () => ({})),
    getUrlMapping: vi.fn(async () => ({})),
    getCategorizedItems: vi.fn(async () => []),
    search: vi.fn(async () => []),
    getFineMaterials: vi.fn(async () => []),
  },
}));

vi.mock("./dbService.js", () => ({
  getGearSetTags: vi.fn(async () => []),
  getUserStats: vi.fn(async () => ({ walking: 5 })),
  getUserOwnedItems: vi.fn(async () => []),
  getUserFactionReputations: vi.fn(async () => ({})),
  getGearSets: vi.fn(async () => []),
  getUserSettings: vi.fn(async () => ({})),
}));

let bootstrapService;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  list.mockReset();
  list.mockResolvedValue([{ id: 1 }]);
  bootstrapService = await import("./bootstrapService.js");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getStaticBundle", () => {
  it("builds once and shares the result between concurrent callers", async () => {
    const [a, b] = await Promise.all([
      bootstrapService.getStaticBundle(),
      bootstrapService.getStaticBundle(),
    ]);

    expect(a).toBe(b);
    const parsed = JSON.parse(a.json);
    expect(parsed.activities).toEqual([{ id: 1 }]);
    expect(a.etag).toBe(`"${parsed.version}"`);
    expect(list).toHaveBeenCalledTimes(12);
  });

  it("serves the previous bundle when a rebuild after the TTL fails", async () => {
    const first = await bootstrapService.getStaticBundle();
    vi.advanceTimersByTime(16 * 60 * 1000);
    list.mockRejectedValue(new Error("upstream down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const second = await bootstrapService.getStaticBundle();
    expect(second).toBe(first);
  });
});

describe("getUserBundle", () => {
  it("combines the per-user sections", async () => {
    const bundle = await bootstrapService.getUserBundle("uuid");
    expect(bundle).toEqual({
      userStats: { walking: 5 },
      ownedItems: [],
      factionReputations: {},
      gearSets: [],
      userSettings: {},
    });
  });
});
