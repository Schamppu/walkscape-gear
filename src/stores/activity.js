import { defineStore } from "pinia";

export const useActivityStore = defineStore("activity", {
  state: () => ({
    skill: null,
    level: 0,
    activity: null,
  }),
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
  },
});
