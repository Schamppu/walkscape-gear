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

    updateUrlWithGearSet(gearSetId) {
      const url = new URL(window.location.href);
      if (gearSetId) {
        url.searchParams.set("gs", gearSetId);
      } else {
        url.searchParams.delete("gs");
      }
      window.history.replaceState({}, "", url);
    },

    async decodeFromUrlAndApply() {
      const params = new URLSearchParams(window.location.search);
      const encodedGear = params.get("q");
      const gearSetIdParam = params.get("gs");

      // Parse gear set ID to number with validation
      const gearSetId = gearSetIdParam ? parseInt(gearSetIdParam, 10) : null;
      const isValidGearSetId = gearSetId && !isNaN(gearSetId) && gearSetId > 0;

      // Prioritize 'q' parameter over 'gs' parameter
      if (encodedGear) {
        // If we have encoded gear data, use that and ignore gear set
        await this._applyEncodedGearLoadout(encodedGear);
      } else if (isValidGearSetId) {
        // Only gear set ID is present and valid, try to load that gear set
        await this._applyGearSetFromUrl(gearSetId);
      } else if (gearSetIdParam) {
        // Invalid gear set ID format, remove it from URL
        console.warn(
          `Invalid gear set ID format: ${gearSetIdParam}, removing from URL`
        );
        const url = new URL(window.location.href);
        url.searchParams.delete("gs");
        window.history.replaceState({}, "", url);
      }

      if (isValidGearSetId) {
        const { useGearSetStore } = await import("./gearSet");
        const gearSetStore = useGearSetStore();
        gearSetStore.loadSet(gearSetId);
      }
    },

    async _applyEncodedGearLoadout(encoded) {
      const { decodeGearLoadout } = useUrlMap();
      const decodedLoadout = decodeGearLoadout(encoded);

      const gearStore = useGearStore();
      const activityStore = useActivityStore();

      // Separate gear items from activity/recipe data
      const gearData = {};
      const activityPromises = [];
      const ringId = decodedLoadout["ring1"];

      Object.entries(decodedLoadout).forEach(([slot, id]) => {
        if (!id) return;

        if (slot === "activity") {
          activityPromises.push(activityStore.loadActivity(id));
          activityPromises.push(activityStore.loadActivityLocations(id));
        } else if (slot === "recipe") {
          activityPromises.push(activityStore.loadRecipe(id));
        } else {
          // This is a gear slot
          const useQ2 = slot === "ring2" && ringId === id;
          const quality = gearStore.determineQuality(id, useQ2);
          gearData[slot] = { id, quality };
        }
      });

      // Handle gear and activity data in parallel
      const promises = [];

      // Use the optimized equipMultiple for all gear items at once
      if (Object.keys(gearData).length > 0) {
        promises.push(gearStore.equipMultiple(gearData, true));
      }

      // Handle activity store calls
      if (activityPromises.length > 0) {
        promises.push(Promise.all(activityPromises));
      }

      await Promise.all(promises);
    },

    async _applyGearSetFromUrl(gearSetId) {
      const { useGearSetStore } = await import("./gearSet");
      const gearSetStore = useGearSetStore();

      // Ensure gear sets are loaded
      await gearSetStore.fetchGearSets();

      // Check if the gear set exists (gearSetId is already a number)
      const gearSetExists = gearSetStore.gearSets.some(
        (set) => set.id === gearSetId
      );

      if (gearSetExists) {
        // Load and equip the gear set
        await gearSetStore.selectAndEquipSet(gearSetId);
      } else {
        // Gear set doesn't exist (maybe shared URL), remove from URL
        console.warn(`Gear set ${gearSetId} not found, removing from URL`);
        const url = new URL(window.location.href);
        url.searchParams.delete("gs");
        window.history.replaceState({}, "", url);
      }
    },
  },
});
