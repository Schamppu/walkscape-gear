import { defineStore } from "pinia";
import { getUrlMap } from "@/utils/axios/api_routes";
import { useUrlMap } from "@/utils/useUrlMap";
import { useActivityStore } from "./activity";
import { useGearStore } from "./gear";
import { useItemsStore } from "./items";

export const useUrlStore = defineStore("url", {
  state: () => ({
    mapping: {},
    reverseMapping: {},
    order: {
      activity: "activity",
      cape: "cape",
      back: "back",
      neck: "neck",
      hands: "hands",
      head: "head",
      chest: "chest",
      legs: "legs",
      feet: "feet",
      primary: "primary",
      secondary: "secondary",
      ring1: "ring",
      ring2: "ring",
      tool1: "tool",
      tool2: "tool",
      tool3: "tool",
      tool4: "tool",
      tool5: "tool",
      tool6: "tool",
      potion: "potion",
      consumable: "consumable",
      service: "service",
    },
  }),

  actions: {
    async fetchMapping() {
      const { data: response } = await getUrlMap();
      this.mapping = response;

      const reverse = {};
      for (const slot in this.mapping) {
        reverse[slot] = Object.fromEntries(
          this.mapping[slot].map((id, index) => [id, index])
        );
      }
      this.reverseMapping = reverse;
    },

    encodeAndPushToUrl() {
      const { encodeGearLoadout } = useUrlMap();
      const encoded = encodeGearLoadout();

      const url = new URL(window.location.href);
      url.searchParams.set("loadout", encoded);
      window.history.replaceState({}, "", url);
    },

    decodeFromUrlAndApply() {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("loadout");
      if (!encoded) return;

      const { decodeGearLoadout } = useUrlMap();
      const decodedLoadout = decodeGearLoadout(encoded);

      const gearStore = useGearStore();
      const activityStore = useActivityStore();
      const itemsStore = useItemsStore();

      for (const slot in decodedLoadout) {
        const id = decodedLoadout[slot];
        if (!id) continue;

        if (slot === "activity") {
          activityStore.loadActivity(id);
        } else {
          gearStore.loadItem(slot, id);
        }
      }
    },
  },
});
