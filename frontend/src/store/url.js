import { defineStore } from "pinia";
import { getUrlMap } from "@/utils/axios/api_routes";
import { useUrlMap } from "@/utils/useUrlMap";
import { useActivityStore } from "./activity";
import { useGearStore } from "./gear";

export const useUrlStore = defineStore("url", {
  state: () => ({
    mapping: {},
    reverseMapping: {},
    order: {
      activity: "activity",
      recipe: "recipe",
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
      const { encodeGearLoadout } = useUrlMap();
      const encoded = encodeGearLoadout();

      const url = new URL(window.location.href);
      url.searchParams.set("q", encoded);
      window.history.replaceState({}, "", url);
    },

    async decodeFromUrlAndApply() {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("q");
      if (!encoded) return;

      const { decodeGearLoadout } = useUrlMap();
      const decodedLoadout = decodeGearLoadout(encoded);

      const gearStore = useGearStore();
      const activityStore = useActivityStore();

      const ringId = decodedLoadout["ring1"];
      const promises = [];
      Object.entries(decodedLoadout).forEach(([slot, id]) => {
        if (!id) return;

        const useQ2 = slot === "ring2" && ringId === id;
        const quality = gearStore.determineQuality(id, useQ2);

        if (slot === "activity") {
          promises.push(activityStore.loadActivity(id));
          promises.push(activityStore.loadActivityLocations(id));
        } else if (slot === "recipe") {
          promises.push(activityStore.loadRecipe(id));
        } else {
          promises.push(gearStore.loadItem(slot, id, quality));
        }
      });

      await Promise.all(promises);
    },
  },
});
