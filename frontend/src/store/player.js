import { defineStore } from "pinia";

export const usePlayerStore = defineStore("playerStore", {
  state: () => ({
    skillLevels: {},
    achievementPoints: 0,
    userUuid: null,
  }),
  actions: {
    setSkillLevel(id, value) {
      this.skillLevels[id] = value;
    },
    setAchievementPoints(value) {
      this.achievementPoints = value;
    },
    setUuid(uuid) {
      this.userUuid = uuid;
    },
  },
});
