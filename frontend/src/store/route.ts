import { defineStore } from "pinia";
import {
  getLocations,
  getRoutes,
  getTerrainModifiers,
} from "@/utils/axios/api_routes";
import type {
  LocationSummary,
  RouteSummary,
  TerrainModifier,
  Requirement,
} from "@/domain/types";
import type { RouteSegmentStats } from "@/domain/types/route";
import { useNotificationStore } from "@/store/notifications";

export type { RouteSegmentStats };

export type LocationInfo = Omit<LocationSummary, "id"> & { id: string; color: string };

export type LocationMapEntry = Omit<LocationSummary, "id">;

export type TerrainModifierMapEntry = Omit<TerrainModifier, "id">;

export type RouteSegment = {
  from: LocationInfo;
  to: LocationInfo;
  stats: RouteSegmentStats;
  route: { to: string; distance: number; requirements: TerrainModifier[][] | null };
  context: unknown;
  distance: number;
  terrainModifiers: TerrainModifier[][];
  requirements: Requirement[];
};

export const useRouteStore = defineStore("routeStore", {
  state: () => ({
    isLoaded: false,
    start: null as string | null,
    end: null as string | null,
    locations: [] as LocationSummary[],
    locationsMap: {} as Record<string, LocationMapEntry>,
    routes: [] as RouteSummary[],
    segments: [] as RouteSegment[],
    terrainModifiers: [] as TerrainModifier[],
    terrainModifiersMap: {} as Record<string, TerrainModifierMapEntry>,
  }),
  actions: {
    async fetchRouteData(): Promise<void> {
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
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `Route: loaded ${this.locations.length} locations, ${this.routes.length} routes, ${this.terrainModifiers.length} terrain modifiers`,
      );
    },
    findRoute(start: string, end: string): RouteSummary | undefined {
      if (!start || !end) return undefined;
      const route = this.routes.find(({ locations }) => {
        const [a, b] = locations;
        return (a === start && b === end) || (b === start && a === end);
      });
      return route;
    },
    setStart(location: string | null): void {
      this.start = location;
    },
    setEnd(location: string | null): void {
      this.end = location;
    },
    setSegments(segments: RouteSegment[]): void {
      this.segments = segments;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(`Route: path set with ${segments.length} segment(s)`);
    },
  },
});
