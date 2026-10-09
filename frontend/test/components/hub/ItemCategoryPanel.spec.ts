import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { computed } from "vue";
import ItemCategoryPanel from "@/components/hub/ItemCategoryPanel.vue";
import { useItemsStore } from "@/store/items";
import { BaseContextKey } from "@/composables/context/injectionKeys";

vi.mock("@/utils/axios/db_routes", () => ({
  upsertOwnedItems: vi.fn(() => Promise.resolve()),
  fetchOwnedItems: vi.fn(() => Promise.resolve({ data: [] })),
}));

const consumables = [
  { id: "pie", name: "Pie", quality: "common" },
  { id: "stew", name: "Stew", quality: "common" },
];

const mountPanel = () =>
  mount(ItemCategoryPanel, {
    props: { group: "Consumables", title: "Consumables", itemCategory: "consumables", isOpen: false },
    global: {
      provide: { [BaseContextKey as symbol]: { embargoedItems: computed(() => new Set()) } },
    },
  });

describe("ItemCategoryPanel consumables select all", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useItemsStore();
    store.itemsByCategory = { consumables } as never;
    store.toggleItem({ itemId: "stew", hidden: false, owned: true, quantity: 9, quantityFine: 4 });
  });

  it("gives consumables you have none of a normal count of 1 and keeps existing counts", async () => {
    const wrapper = mountPanel();
    await wrapper.find('input[aria-label="Select all"]').setValue(true);
    const store = useItemsStore();
    expect(store.ownedItems.pie).toMatchObject({ owned: true, quantity: 1, quantityFine: 0, consumableCommon: true });
    expect(store.ownedItems.stew).toMatchObject({ quantity: 9, quantityFine: 4 });
  });

  it("sets every count to 0 when unchecked", async () => {
    const wrapper = mountPanel();
    const selectAll = wrapper.find('input[aria-label="Select all"]');
    await selectAll.setValue(true);
    await selectAll.setValue(false);
    const store = useItemsStore();
    for (const id of ["pie", "stew"]) {
      expect(store.ownedItems[id]).toMatchObject({ owned: false, quantity: 0, quantityFine: 0, consumableFine: false });
    }
  });
});
