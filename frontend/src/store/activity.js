import { defineStore } from "pinia";
import { getActivity } from "@/utils/axios/api_routes";

export const useActivityStore = defineStore("activity", {
  state: () => ({
    skill: null,
    level: 0,
    activity: null,
  }),
  getters: {
    activitySelected: (state) =>
      state.activity &&
      state.activity.name &&
      state.activity.name.toLowerCase() !== "none",
  },
  actions: {
    setSkill(skill) {
      this.skill = skill;
    },
    setLevel(level) {
      this.level = level;
    },
    setActivity(activity) {
      this.activity = activity;
    },
    async loadActivity(id) {
      const activity = await getActivity({ id });
      this.setActivity(activity);
    },
  },
});
