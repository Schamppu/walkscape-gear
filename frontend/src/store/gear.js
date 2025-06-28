import { defineStore } from "pinia";
import { getItem, searchItems } from "@/utils/axios/api_routes";
import { useItemsStore } from "./items";

export const useGearStore = defineStore("gearStore", {
  state: () => ({
    gearSlots: {
      cape: null,
      back: null,
      neck: null,
      hands: null,
      head: null,
      chest: null,
      legs: null,
      feet: null,
      primary: null,
      secondary: null,
      ring1: null,
      ring2: null,
      tool1: null,
      tool2: null,
      tool3: null,
      tool4: null,
      tool5: null,
      tool6: null,
      potion: null,
      consumable: null,
      service: null,
    },
    showOwned: true,
    showUseful: true,
  }),
  getters: {
    filledGearSlots: (state) => {
      return Object.values(state.gearSlots).filter(Boolean) || [];
    },
  },
  actions: {
    get(slot) {
      return this.gearSlots[slot];
    },
    setGearSlot(slot, item) {
      this.gearSlots[slot] = item;
    },
    updateStats(slot, data) {
      const { itemAttrs } = data;
      this.gearSlots[slot].itemAttrs = itemAttrs;
    },
    slotFilled(slot) {
      return !!this.gearSlots[slot];
    },
    getSlotTypes(slot) {
      if (slot === "service") return ["service"];
      else if (slot === "potion") return ["potion"];
      else if (slot === "consumable") return ["consumable"];
      return ["loot", "crafted"];
    },
    getSearchEndpoint(slot) {
      if (slot === "service") return () => ({ name: "None", id: "-1" });
      return searchItems;
    },
    async loadItem(itemSlot, id) {
      if (!id) {
        console.error("no id provided");
        return;
      }

      const itemsStore = useItemsStore();
      const existsInAll = id in itemsStore.allItems;
      if (!existsInAll) return;

      const previousItem = this.gearSlots[itemSlot];
      if (previousItem?.id === id) return;

      await getItem({ id }).then(({ data }) => {
        const owned = id in itemsStore.ownedItems;
        const quality = owned
          ? itemsStore.ownedItems[id].quality
          : itemsStore.allItems[id].quality || "common";

        if (data) {
          this.setGearSlot(itemSlot, { ...data, quality });
        }
      });
    },
  },
});
