import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import * as api from "@/utils/axios/api_routes";

vi.mock("@/utils/axios/api_routes", () => ({
  getItem: vi.fn(),
  getPet: vi.fn(),
  getMultipleItems: vi.fn(),
  searchItems: vi.fn(),
}));

vi.mock("@/domain/pets/getPetIcon", () => ({
  getPetIcon: (_pet: unknown, level: number) => `pet-icon-${level}`,
}));

const response = <T>(data: T) => ({ data }) as never;

describe("gearStore._fetchMultipleItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    useItemsStore().petsMap = { dog: { id: "dog" } } as never;
  });

  it("fetches items in one batch, the pet on its own, and caches the results", async () => {
    vi.mocked(api.getMultipleItems).mockResolvedValue(
      response([
        { id: "ring", name: "Ring", icon: "ring.png" },
        { id: "hat", name: "Hat", icon: "hat.png" },
      ]),
    );
    vi.mocked(api.getPet).mockResolvedValue(
      response({ id: "dog", name: "Dog" }),
    );
    const store = useGearStore();

    const results = await store._fetchMultipleItems([
      { slot: "ring1", id: "ring", quality: "rare" },
      { slot: "ring2", id: "ring", quality: "epic" },
      { slot: "head", id: "hat", quality: "common" },
      { slot: "pet", id: "dog", quality: "3" },
    ]);

    expect(api.getMultipleItems).toHaveBeenCalledWith(["ring", "hat"]);
    expect(api.getPet).toHaveBeenCalledWith({ id: "dog" });
    expect(results.map(({ data }) => data?.quality)).toEqual([
      "rare",
      "epic",
      "common",
      "3",
    ]);
    expect(results[3].data?.icon).toBe("pet-icon-3");
    expect(store._getFromCache("ring", "epic")?.name).toBe("Ring");
  });

  it("skips the request for cached entries and returns null for unknown ids", async () => {
    vi.mocked(api.getMultipleItems).mockResolvedValue(response([null]));
    const store = useGearStore();
    store._setInCache("ring", "rare", {
      id: "ring",
      quality: "rare",
      icon: "",
    } as never);

    const results = await store._fetchMultipleItems([
      { slot: "ring1", id: "ring", quality: "rare" },
      { slot: "head", id: "missing", quality: null },
    ]);

    expect(api.getMultipleItems).toHaveBeenCalledWith(["missing"]);
    expect(api.getPet).not.toHaveBeenCalled();
    expect(results[0].data?.id).toBe("ring");
    expect(results[1].data).toBeNull();
  });

  it("returns null for a batch that fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.getMultipleItems).mockRejectedValue(new Error("down"));
    const store = useGearStore();

    const [result] = await store._fetchMultipleItems([
      { slot: "head", id: "hat", quality: "common" },
    ]);

    expect(result.data).toBeNull();
  });
});
