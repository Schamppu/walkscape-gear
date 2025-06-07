import { defineStore } from "pinia";
import { getActivity, searchLocations } from "@/utils/axios/api_routes";

export const useActivityStore = defineStore("activity", {
  state: () => ({
    activity: null,
    locations: null,
  }),
  getters: {
    activitySelected: (state) => {
      return state.activity !== null && state.activity.id !== "activity-none";
    },
  },
  actions: {
    setActivity(activity) {
      this.activity = activity;
    },
    setLocations(locations) {
      this.locations = locations;
    },
    async loadActivity(id) {
      const { data: activity } = await getActivity({ id });
      this.setActivity(activity);
    },
    async loadActivityLocations(id) {
      const { data: locations } = await searchLocations({ activityList: id });
      this.setLocations(locations);
    },
  },
});
