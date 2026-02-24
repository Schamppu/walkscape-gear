import { defineStore } from "pinia";
import { getUrlMap } from "@/utils/axios/api_routes";
import { useUrlMap } from "@/composables/useUrlMap";
import { useActivityStore } from "./activity";
import { useGearStore } from "./gear";
import type { UrlMap } from "@/domain/types/item";
import { buildReverseMapping, type ReverseMapping, type SlotOrder, type DecodedLoadout } from "@/utils/urlEncoding";
import { parseGearSetId } from "@/store/utils/urlUtils";
import { useNotificationStore } from "@/store/notifications";

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUrlStore = defineStore("url", {
  state: () => ({
    mapping: {} as UrlMap,
    reverseMapping: {} as ReverseMapping,
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
      pet: "pet",
    } as SlotOrder,
    isLoaded: false,
  }),

  actions: {
    async fetchMapping(): Promise<void> {
      if (this.isLoaded) return;

      const { data: response } = await getUrlMap();
      this.mapping = response;
      this.reverseMapping = buildReverseMapping(response);
      this.isLoaded = true;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(`URL: loaded mapping with ${Object.keys(response).length} entries`);
    },

    encodeAndPushToUrl(): void {
      const { encodeGearLoadout } = useUrlMap();
      const encoded = encodeGearLoadout();

      const url = new URL(window.location.href);
      url.searchParams.set("q", encoded);
      window.history.replaceState({}, "", url);
    },

    updateUrlWithGearSet(gearSetId: number | null, index: number): void {
      const url = new URL(window.location.href);
      const key = index ? "gs2" : "gs";

      if (gearSetId) {
        url.searchParams.set(key, String(gearSetId));
      } else {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, "", url);
    },

    async decodeFromUrlAndApply(): Promise<void> {
      const params = new URLSearchParams(window.location.search);
      const encodedGear = params.get("q");
      const gearSetId = parseGearSetId(params, "gs");

      // Prioritize 'q' parameter over 'gs' parameter
      if (encodedGear) {
        await this._applyEncodedGearLoadout(encodedGear);
      } else if (gearSetId !== null) {
        await this._applyGearSetFromUrl(gearSetId);
      } else if (params.get("gs")) {
        console.warn(
          `Invalid gear set ID format: ${params.get("gs")}, removing from URL`,
        );
        const url = new URL(window.location.href);
        url.searchParams.delete("gs");
        window.history.replaceState({}, "", url);
      }

      if (gearSetId !== null) {
        const { useGearSetStore } = await import("./gearSet");
        const gearSetStore = useGearSetStore();
        gearSetStore.loadSet(gearSetId);
      }
    },

    async _applyEncodedGearLoadout(encoded: string): Promise<void> {
      const { decodeGearLoadout } = useUrlMap();
      const decodedLoadout = decodeGearLoadout(encoded) as DecodedLoadout;

      const gearStore = useGearStore();
      const activityStore = useActivityStore();

      const gearData: Record<string, { id: string; quality: string }> = {};
      const activityPromises: Promise<void>[] = [];
      const ringId = decodedLoadout["ring1"];

      Object.entries(decodedLoadout).forEach(([slot, id]) => {
        if (!id) return;

        if (slot === "activity") {
          activityPromises.push(activityStore.loadActivity(id));
          activityPromises.push(activityStore.loadActivityLocations(id));
        } else if (slot === "recipe") {
          activityPromises.push(activityStore.loadRecipe(id));
        } else {
          const useQ2 = slot === "ring2" && ringId === id;
          const quality = gearStore.determineQuality(id, useQ2);
          gearData[slot] = { id, quality };
        }
      });

      const gearSlotCount = Object.keys(gearData).length;
      const hasActivity = decodedLoadout["activity"] != null;
      const hasRecipe = decodedLoadout["recipe"] != null;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `URL: applying encoded loadout  ${gearSlotCount} gear slot(s)` +
        (hasActivity ? ", activity" : "") +
        (hasRecipe ? ", recipe" : ""),
      );

      const promises: Promise<unknown>[] = [];

      if (Object.keys(gearData).length > 0) {
        promises.push(gearStore.equipMultiple(gearData, true));
      }

      if (activityPromises.length > 0) {
        promises.push(Promise.all(activityPromises));
      }

      await Promise.all(promises);
    },

    async _applyGearSetFromUrl(gearSetId: number): Promise<void> {
      const { useGearSetStore } = await import("./gearSet");
      const gearSetStore = useGearSetStore();

      await gearSetStore.fetchGearSets();

      const gearSetExists = gearSetStore.gearSets.some(
        (set) => set.id === gearSetId,
      );

      if (gearSetExists) {
        const notificationStore = useNotificationStore();
        void notificationStore.debug(`URL: applying gear set ${gearSetId} from URL`);
        await gearSetStore.selectAndEquipSet(gearSetId);
      } else {
        console.warn(`Gear set ${gearSetId} not found, removing from URL`);
        const url = new URL(window.location.href);
        url.searchParams.delete("gs");
        window.history.replaceState({}, "", url);
      }
    },
  },
});
