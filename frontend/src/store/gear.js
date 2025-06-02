import { defineStore } from "pinia";
import { getItem, searchItems } from "@/utils/axios/api_routes";

export const useGearStore = defineStore("gearStore", {
  state: () => ({
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
    useOwned: true,
  }),
  actions: {
    get(slot) {
      return this[slot];
    },
    setGearSlot(slot, item) {
      this[slot] = item;
    },
    updateStats(slot, data) {
      const { itemAttrs } = data;
      this[slot].itemAttrs = itemAttrs;
    },
    slotFilled(slot) {
      return !!this[slot];
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
    async loadItem(itemSlot, id, quality) {
      const previousItem = this[itemSlot];
      if (id) {
        await getItem({ id, quality }).then(({ data }) => {
          if (data) {
            previousItem && previousItem.id
              ? this.updateStats(itemSlot, data)
              : this.setGearSlot(itemSlot, data);
          }
        });
      } else {
        console.error("no id provided");
      }
    },
    async itemSearch({ gearType, searchKey } = {}) {
      const types = this.getSlotTypes(gearType);
      const usedGearType = ["service", "consumable", "potion"].includes(
        gearType
      )
        ? null
        : gearType;
      // const searchEndpoint = search;
      const data = await searchItems({
        types,
        search: searchKey,
        gearType: usedGearType,
      }).then(({ data }) => {
        return data;
      });
      return data;
    },
  },
});
