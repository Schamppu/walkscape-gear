import { defineStore } from "pinia";
import {
  getLocations,
  getRoutes,
  getTerrainModifiers,
} from "@/utils/axios/api_routes";

export const useRouteStore = defineStore("routeStore", {
  state: () => ({
    isLoaded: false,
    start: null,
    end: null,
    locations: [],
    locationsMap: {},
    routes: [],
    terrainModifiers: [],
    terrainModifiersMap: {},
  }),
  actions: {
    async fetchRouteData() {
      if (this.isLoaded) return;

      const [
        { data: locations },
        { data: routes },
        { data: terrainModifiers },
      ] = await Promise.all([
        getLocations(),
        getRoutes(),
        getTerrainModifiers(),
      ]);

      this.locations = locations;
      this.locationsMap = Object.fromEntries(
        locations.map(({ id, ...rest }) => [id, rest])
      );
      this.routes = routes;
      this.terrainModifiers = terrainModifiers;
      this.terrainModifiersMap = Object.fromEntries(
        terrainModifiers.map(({ id, ...rest }) => [id, rest])
      );

      this.isLoaded = true;
    },
    findRoute(start, end) {
      if (!start || !end) return null;
      const route = this.routes.find(({ locations }) => {
        const [a, b] = locations;
        return (a === start && b === end) || (b === start && a === end);
      });
      return route;
    },
    setStart(location) {
      this.start = location;
    },
    setEnd(location) {
      this.end = location;
    },
  },
});
