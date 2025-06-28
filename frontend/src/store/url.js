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
      consumable: "consumable",
    },
    isLoaded: false,
  }),

  actions: {
    async fetchMapping() {
      if (this.isLoaded) return;
      const { data: response } = await getUrlMap();
      this.mapping = response;

      const reverse = {};
      for (const slot in this.mapping) {
        reverse[slot] = Object.fromEntries(
          this.mapping[slot].map((id, index) => [id, index])
        );
      }
      this.reverseMapping = reverse;
      this.isLoaded = true;
    },

    encodeAndPushToUrl() {
      const { encodeGearLoadout, decodeGearLoadout } = useUrlMap();
      const encoded = encodeGearLoadout();
      const decoded = decodeGearLoadout(encoded);

      const url = new URL(window.location.href);
      url.pathname = "/" + encoded;
      window.history.replaceState({}, "", url);
    },

    async decodeFromUrlAndApply() {
      const path = window.location.pathname;
      const encoded = path.slice(1);
      if (!encoded) return;

      const { decodeGearLoadout } = useUrlMap();
      const decodedLoadout = decodeGearLoadout(encoded);

      const gearStore = useGearStore();
      const activityStore = useActivityStore();
      const itemsStore = useItemsStore();

      const promises = [];
      Object.entries(decodedLoadout).forEach(([slot, id]) => {
        if (!id) return;
        if (slot === "activity") {
          promises.push(activityStore.loadActivity(id));
        } else {
          promises.push(gearStore.loadItem(slot, id));
        }
      });

      await Promise.all(promises);
    },
  },
});
