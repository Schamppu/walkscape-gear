// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export type LocationSummary = {
  id: string;
  name: string;
  faction: string;
  subFactions: string[];
  keywords?: string[];
  icon: string;
};

export type LocationDetail = LocationSummary & {
  activityList: string[];
  serviceList: string[];
  buildingList: string[];
  jobBoards: string[];
};
