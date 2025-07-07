import { defineStore } from "pinia";
import { getItem, searchItems } from "@/utils/axios/api_routes";
import { useItemsStore } from "./items";

export const useGearStore = defineStore("gearStore", {
  state: () => ({
    gearSlots: {
      head: null,
      cape: null,
      back: null,
      chest: null,
      primary: null,
      secondary: null,
      hands: null,
      legs: null,
      neck: null,
      feet: null,
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

    determineQuality(id, q2 = false) {
      const itemsStore = useItemsStore();
      const owned = id in itemsStore.ownedItems;
      if (!owned)
        return id in itemsStore.allItems
          ? itemsStore.allItems[id].quality
          : "common";
      const entry = itemsStore.ownedItems[id];
      let quality = "common";
      if (entry.quality) quality = entry.quality;
      if (q2 && entry.quality2) quality = entry.quality2;
      return quality;
    },

    async _fetchAndSetItem(itemSlot, id, quality) {
      await getItem({ id }).then(({ data }) => {
        if (data) {
          this.setGearSlot(itemSlot, { ...data, quality });
        }
      });
    },

    async loadItem(itemSlot, id, itemQuality = null) {
      if (!id) {
        console.error("no id provided");
        return;
      }

      const itemsStore = useItemsStore();
      if (!(id in itemsStore.allItems)) return;

      const previousItem = this.gearSlots[itemSlot];
      if (previousItem?.id === id && previousItem.quality === itemQuality)
        return;

      const quality = itemQuality || this.determineQuality(id);
      await this._fetchAndSetItem(itemSlot, id, quality);
    },
  },
});
