import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePlayerStore } from "@/store/player";
import { useDataStore } from "@/store/data";
import RealmLocationCountDisplay from "@/components/hub/RealmLocationCountDisplay.vue";
import RealmLocations from "@/components/hub/RealmLocations.vue";
import { upsertPlayerStats } from "@/utils/axios/db_routes";

vi.mock("@/utils/axios/db_routes", () => ({
  upsertPlayerStats: vi.fn(),
  upsertFactionReputations: vi.fn(),
}));

const REALM = {
  id: "jarvonia",
  name: "Jarvonia",
  icon: "icon.png",
  color: "FF112233",
  reputation: "jarvoniaReputation",
  locationCount: 12,
};

describe("RealmLocationCountDisplay", () => {
  let playerStore: ReturnType<typeof usePlayerStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    playerStore = usePlayerStore();
    const dataStore = useDataStore();
    dataStore.realmsMap = { jarvonia: REALM };
    playerStore.realmLocations = { jarvonia: 3 };
    playerStore.factionsMap = {};
  });

  it("binds the value, max and border colour", () => {
    const w = mount(RealmLocationCountDisplay, { props: { realm: REALM } });
    const input = w.find("input");
    expect(input.element.value).toBe("3");
    expect(input.attributes("max")).toBe("12");
    expect(input.attributes("min")).toBe("0");
    expect(w.find(".wrapper").attributes("style")).toContain("rgba(17, 34, 51, 1)");
  });

  it("points up below max and clicking jumps to max", async () => {
    const w = mount(RealmLocationCountDisplay, { props: { realm: REALM } });
    expect(w.find(".chevron-button").text()).toBe("▲");
    await w.find(".chevron-button").trigger("click");
    expect(playerStore.realmLocations.jarvonia).toBe(12);
    expect(w.find("input").element.value).toBe("12");
    expect(w.emitted("input")).toEqual([[12]]);
  });

  it("points down at max and clicking returns to zero", async () => {
    playerStore.realmLocations = { jarvonia: 12 };
    const w = mount(RealmLocationCountDisplay, { props: { realm: REALM } });
    expect(w.find(".chevron-button").text()).toBe("▼");
    await w.find(".chevron-button").trigger("click");
    expect(playerStore.realmLocations.jarvonia).toBe(0);
    expect(w.emitted("input")).toEqual([[0]]);
  });

  it("clamps typed input to the realm location count", async () => {
    const w = mount(RealmLocationCountDisplay, { props: { realm: REALM } });
    const input = w.find("input");
    await input.setValue("999");
    await input.trigger("blur");
    expect(playerStore.realmLocations.jarvonia).toBe(12);
  });

  it("upserts <realm>Locations player stats once, debounced", async () => {
    const w = mount(RealmLocations);
    expect(w.findAllComponents(RealmLocationCountDisplay)).toHaveLength(1);
    await w.find(".chevron-button").trigger("click");
    await w.find(".chevron-button").trigger("click");
    expect(upsertPlayerStats).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(upsertPlayerStats).toHaveBeenCalledTimes(1);
    expect(upsertPlayerStats).toHaveBeenCalledWith({ jarvoniaLocations: 0 });
  });
});
