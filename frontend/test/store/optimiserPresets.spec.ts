import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { AxiosError, type AxiosResponse } from "axios";
import { useOptimiserPresetsStore } from "@/store/optimiserPresets";
import * as api from "@/utils/axios/db_routes";
import type { DbOptimiserPreset } from "@/domain/types/db";

vi.mock("@/utils/axios/db_routes", () => ({
  getOptimiserPresets: vi.fn(),
  upsertOptimiserPreset: vi.fn(),
  deleteOptimiserPreset: vi.fn(),
  reorderOptimiserPresets: vi.fn(),
  getSettings: vi.fn(),
  upsertSettings: vi.fn(),
}));

const notifications = { error: vi.fn(), success: vi.fn(), debug: vi.fn() };
vi.mock("@/store/notifications", () => ({
  useNotificationStore: () => notifications,
}));

const dbPreset = (id: number, name = `Preset ${id}`): DbOptimiserPreset => ({
  id,
  name,
  targets: [{ x: "chests", y: "action", weight: 5 }],
  sortOrder: id,
});

const httpError = (status: number, error: string) =>
  new AxiosError("Request failed", undefined, undefined, undefined, {
    status,
    data: { error },
  } as AxiosResponse);

const loadedStore = async (
  presets = [dbPreset(1), dbPreset(2)],
  settings = {},
) => {
  vi.mocked(api.getOptimiserPresets).mockResolvedValue(presets);
  vi.mocked(api.getSettings).mockResolvedValue(settings);
  const store = useOptimiserPresetsStore();
  await store.ensureLoaded();
  return store;
};

describe("optimiser presets store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    // Failures are logged as well as notified; keep the expected ones quiet.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("lists the player's presets before the built-ins", async () => {
    const store = await loadedStore();
    expect(store.presets.map((p) => p.id).slice(0, 3)).toEqual([
      "user:1",
      "user:2",
      "builtin:eternal-per-material",
    ]);
  });

  it("fetches once, even when asked twice at once", async () => {
    vi.mocked(api.getOptimiserPresets).mockResolvedValue([]);
    vi.mocked(api.getSettings).mockResolvedValue({});
    const store = useOptimiserPresetsStore();
    await Promise.all([store.ensureLoaded(), store.ensureLoaded()]);
    await store.ensureLoaded();
    expect(api.getOptimiserPresets).toHaveBeenCalledTimes(1);
  });

  it("offers only the built-ins when loading fails, and retries later", async () => {
    vi.mocked(api.getOptimiserPresets).mockRejectedValueOnce(
      new Error("offline"),
    );
    vi.mocked(api.getSettings).mockResolvedValue({});
    const store = useOptimiserPresetsStore();
    await store.ensureLoaded();
    expect(store.isLoaded).toBe(false);
    expect(store.presets.every((p) => p.builtin)).toBe(true);
    expect(notifications.error).toHaveBeenCalled();

    vi.mocked(api.getOptimiserPresets).mockResolvedValue([dbPreset(1)]);
    await store.ensureLoaded();
    expect(store.presets[0].id).toBe("user:1");
  });

  it("drops targets it doesn't know from a saved preset", async () => {
    const store = await loadedStore([
      {
        ...dbPreset(1),
        targets: [
          { x: "future", y: "step", weight: 5 },
          { x: "xp", y: "step", weight: 3 },
        ],
      },
    ]);
    expect(store.userPresets[0].targets).toEqual([
      { x: "xp", y: "step", weight: 3 },
    ]);
  });

  it("hides built-ins from the hide settings, but still finds them", async () => {
    const store = await loadedStore([], {
      "hideOptimiserPreset:balanced": { value: true, display: 0 },
      "hideOptimiserPreset:items-per-material": { value: false, display: 0 },
      showOwned: { value: true, display: 1 },
    });
    expect(store.hiddenBuiltins).toEqual(["balanced"]);
    expect(store.presets.some((p) => p.id === "builtin:balanced")).toBe(false);
    expect(store.findPreset("builtin:balanced")?.name).toBe("Balanced");
  });

  it("saves a new preset at the top", async () => {
    const store = await loadedStore();
    vi.mocked(api.upsertOptimiserPreset).mockResolvedValue(dbPreset(9, "New"));
    const saved = await store.saveAsNew("New", [
      { x: "chests", y: "action", weight: 5 },
    ]);
    expect(api.upsertOptimiserPreset).toHaveBeenCalledWith({
      name: "New",
      targets: [{ x: "chests", y: "action", weight: 5 }],
    });
    expect(saved?.id).toBe("user:9");
    expect(store.userPresets.map((p) => p.id)).toEqual([
      "user:9",
      "user:1",
      "user:2",
    ]);
  });

  it("overwrites a preset in place", async () => {
    const store = await loadedStore();
    vi.mocked(api.upsertOptimiserPreset).mockResolvedValue(
      dbPreset(2, "Renamed"),
    );
    await store.renamePreset("user:2", "Renamed");
    expect(api.upsertOptimiserPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, name: "Renamed" }),
    );
    expect(store.userPresets.map((p) => p.name)).toEqual([
      "Preset 1",
      "Renamed",
    ]);
  });

  it("does not overwrite a built-in", async () => {
    const store = await loadedStore();
    expect(await store.savePreset("builtin:balanced", "Mine", [])).toBeNull();
    expect(api.upsertOptimiserPreset).not.toHaveBeenCalled();
  });

  it("shows the backend's message when a save is rejected", async () => {
    const store = await loadedStore();
    vi.mocked(api.upsertOptimiserPreset).mockRejectedValue(
      httpError(400, "You can save up to 50 presets"),
    );
    expect(await store.saveAsNew("New", [])).toBeNull();
    expect(notifications.error).toHaveBeenCalledWith(
      "You can save up to 50 presets",
    );
  });

  it("shows a generic message for a server error", async () => {
    const store = await loadedStore();
    vi.mocked(api.upsertOptimiserPreset).mockRejectedValue(
      httpError(500, "Internal Server Error"),
    );
    await store.saveAsNew("New", []);
    expect(notifications.error).toHaveBeenCalledWith("Failed to save preset");
  });

  it("deletes a preset, also one already deleted elsewhere", async () => {
    const store = await loadedStore();
    vi.mocked(api.deleteOptimiserPreset).mockResolvedValueOnce({
      message: "ok",
    });
    expect(await store.deletePreset("user:1")).toBe(true);
    vi.mocked(api.deleteOptimiserPreset).mockRejectedValueOnce(
      httpError(404, "Not found"),
    );
    expect(await store.deletePreset("user:2")).toBe(true);
    expect(store.userPresets).toEqual([]);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it("keeps a preset whose delete failed", async () => {
    const store = await loadedStore();
    vi.mocked(api.deleteOptimiserPreset).mockRejectedValue(
      new Error("offline"),
    );
    expect(await store.deletePreset("user:1")).toBe(false);
    expect(store.userPresets).toHaveLength(2);
  });

  it("swaps two presets and saves the order", async () => {
    const store = await loadedStore([dbPreset(1), dbPreset(2), dbPreset(3)]);
    vi.mocked(api.reorderOptimiserPresets).mockResolvedValue([]);
    await store.swapPresets("user:3", "user:1");
    expect(store.userPresets.map((p) => p.id)).toEqual([
      "user:3",
      "user:2",
      "user:1",
    ]);
    expect(api.reorderOptimiserPresets).toHaveBeenCalledWith([3, 2, 1]);
  });

  it("ignores a swap with an unknown or the same preset", async () => {
    const store = await loadedStore();
    await store.swapPresets("user:1", "user:9");
    await store.swapPresets("user:1", "user:1");
    await store.swapPresets("user:1", "builtin:balanced");
    expect(api.reorderOptimiserPresets).not.toHaveBeenCalled();
  });

  it("reloads the saved order when a swap is rejected", async () => {
    const store = await loadedStore();
    vi.mocked(api.reorderOptimiserPresets).mockRejectedValue(
      httpError(400, "out of sync"),
    );
    await store.swapPresets("user:2", "user:1");
    expect(api.getOptimiserPresets).toHaveBeenCalledTimes(2);
    expect(store.userPresets.map((p) => p.id)).toEqual(["user:1", "user:2"]);
  });

  it("hides and shows a built-in", async () => {
    const store = await loadedStore();
    vi.mocked(api.upsertSettings).mockResolvedValue();
    await store.setBuiltinHidden("builtin:balanced", true);
    expect(store.isHidden("builtin:balanced")).toBe(true);
    expect(api.upsertSettings).toHaveBeenCalledWith([
      { setting: "hideOptimiserPreset:balanced", value: true, display: 0 },
    ]);
    await store.setBuiltinHidden("builtin:balanced", false);
    expect(store.isHidden("builtin:balanced")).toBe(false);
  });

  it("shows a built-in again when hiding it fails", async () => {
    const store = await loadedStore();
    vi.mocked(api.upsertSettings).mockRejectedValue(new Error("offline"));
    await store.setBuiltinHidden("builtin:balanced", true);
    expect(store.isHidden("builtin:balanced")).toBe(false);
  });
});
