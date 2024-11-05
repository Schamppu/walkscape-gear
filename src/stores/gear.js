import { defineStore } from "pinia";
import { search as itemSearch } from "@/utils/axios/items";

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
  }),
  actions: {
    setGearSlot(slot, item) {
      this[slot] = item;
    },
    getSlotTypes(slot) {
      if (slot == "service") return ["service"];
      if (["potion", "consumable"].includes(slot)) return ["consumable"];
      return ["loot", "crafted"];
    },
    getSearchEndpoint(slot) {
      if (slot == "service") return () => ({ name: "None", id: "-1" });
      return itemSearch;
    },
  },
});
