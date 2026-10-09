import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useItemsStore } from "@/store/items";

vi.mock("@/utils/axios/db_routes", () => ({
  upsertOwnedItems: vi.fn(() => Promise.resolve()),
  fetchOwnedItems: vi.fn(() => Promise.resolve({ data: [] })),
}));

describe("itemsStore.toggleItem", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps fields the payload doesn't mention", () => {
    const store = useItemsStore();
    store.ownedItems.ring = {
      owned: true,
      hidden: false,
      quantity: 2,
      quantityFine: 0,
      craftedTier: "rare",
      craftedTier2: "epic",
      consumableCommon: false,
      consumableFine: false,
      petLevel: null,
      petRarity: null,
    };

    store.toggleItem({ itemId: "ring", owned: true, hidden: true, craftedTier: "legendary" });

    expect(store.ownedItems.ring).toMatchObject({
      hidden: true,
      quantity: 2,
      craftedTier: "legendary",
      craftedTier2: "epic",
    });
    expect(store.changedOwnedItems.ring).toBe(store.ownedItems.ring);
  });

  it("fills defaults for a new entry", () => {
    const store = useItemsStore();
    store.toggleItem({ itemId: "hat" });
    expect(store.ownedItems.hat).toEqual({
      owned: true,
      hidden: false,
      quantity: 0,
      quantityFine: 0,
      craftedTier: null,
      craftedTier2: null,
      consumableCommon: false,
      consumableFine: false,
      petLevel: null,
      petRarity: null,
    });
  });

  it("ignores undefined payload fields", () => {
    const store = useItemsStore();
    store.toggleItem({ itemId: "pie", quantity: 5, quantityFine: 2 });
    store.toggleItem({ itemId: "pie", quantity: undefined, hidden: true });
    expect(store.ownedItems.pie).toMatchObject({ quantity: 5, quantityFine: 2, hidden: true });
  });
});
