import { defineStore } from "pinia";
import { getSkills, getFactions } from "@/utils/axios/api_routes";
import { fetchPlayerStats } from "@/utils/axios/db_routes";

export const usePlayerStore = defineStore("playerStore", {
  state: () => ({
    skills: [],
    skillLevels: {},
    factions: [],
    factionReputation: {},
    achievementPoints: 0,
    userUuid: null,
    isLoaded: false,
  }),
  actions: {
    async fetchPlayerData() {
      if (this.isLoaded) return;
      const [{ data: skills }, { data: factions }, stats] = await Promise.all([
        getSkills(),
        getFactions(),
        fetchPlayerStats(),
      ]);

      this.skills = skills
        .map(({ id, ...rest }) => {
          return { id, ...rest, value: id };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      skills.forEach(({ id }) => {
        this.setSkillLevel(id, stats[id] ?? 1);
      });
      this.factions = factions
        .filter(({ reputation }) => reputation !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      factions.forEach(({ reputation }) => {
        this.setFactionReputation(reputation, 0);
      });

      this.setAchievementPoints(stats.achievementPoints ?? 0);
      this.isLoaded = true;
    },
    setSkillLevel(id, value) {
      this.skillLevels[id] = value;
    },
    setAchievementPoints(value) {
      this.achievementPoints = value;
    },
    setFactionReputation(reputation, value) {
      this.factionReputation[reputation] = value;
    },
    setUuid(uuid) {
      this.userUuid = uuid;
    },
  },
});
