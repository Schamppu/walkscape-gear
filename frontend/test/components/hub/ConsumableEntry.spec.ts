import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { computed } from "vue";
import ConsumableEntry from "@/components/hub/ConsumableEntry.vue";
import { useItemsStore } from "@/store/items";
import { BaseContextKey } from "@/composables/context/injectionKeys";

vi.mock("@/utils/axios/db_routes", () => ({
  upsertOwnedItems: vi.fn(() => Promise.resolve()),
  fetchOwnedItems: vi.fn(() => Promise.resolve({ data: [] })),
}));

const item = { id: "pie", name: "Pie", icon: "", buffs: [] };

const mountEntry = () =>
  mount(ConsumableEntry, {
    props: { item, selected: true },
    global: {
      provide: { [BaseContextKey as symbol]: { embargoedItems: computed(() => new Set()) } },
      stubs: { WsIcon: true, StatsDisplay: true },
    },
  });

describe("ConsumableEntry", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useItemsStore();
    store.ownedItems.pie = {
      owned: true,
      hidden: false,
      quantity: 7,
      quantityFine: 2,
      craftedTier: null,
      craftedTier2: null,
      consumableCommon: true,
      consumableFine: true,
      petLevel: null,
      petRarity: null,
    };
  });

  it("shows the common and fine counts and emits nothing on mount", () => {
    const wrapper = mountEntry();
    const [common, fine] = wrapper.findAll("input.count");
    expect((common.element as HTMLInputElement).value).toBe("5");
    expect((fine.element as HTMLInputElement).value).toBe("2");
    expect(wrapper.emitted("change")).toBeUndefined();
  });

  it("emits counts and derived flags when a count changes", async () => {
    const wrapper = mountEntry();
    const fine = wrapper.findAll("input.count")[1];
    await fine.setValue("0");
    expect(wrapper.emitted("change")?.[0]).toEqual([
      {
        itemId: "pie",
        hidden: false,
        owned: true,
        quantity: 5,
        quantityFine: 0,
        consumableCommon: true,
        consumableFine: false,
      },
    ]);
  });

  it("clamps invalid input to a whole number ≥ 0", async () => {
    const wrapper = mountEntry();
    const common = wrapper.findAll("input.count")[0];
    await common.setValue("-3");
    expect((common.element as HTMLInputElement).value).toBe("0");
    expect(wrapper.emitted("change")?.[0]?.[0]).toMatchObject({ quantity: 2, consumableCommon: false });
  });
});
