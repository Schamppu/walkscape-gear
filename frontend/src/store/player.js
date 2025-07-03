import { defineStore } from "pinia";
import { getSkills, getFactions } from "@/utils/axios/api_routes";
import {
  fetchPlayerStats,
  fetchFactionRepuations,
} from "@/utils/axios/db_routes";

export const usePlayerStore = defineStore("playerStore", {
  state: () => ({
    skills: [],
    skillsMap: {},
    skillLevels: {},
    factions: [],
    factionReputation: {},
    stats: [],
    achievementPoints: 0,
    userUuid: null,
    isLoaded: false,
  }),
  actions: {
    async fetchPlayerData() {
      if (this.isLoaded) return;
      const [
        { data: skills },
        { data: factions },
        playerStats,
        factionReputations,
      ] = await Promise.all([
        getSkills(),
        getFactions(),
        fetchPlayerStats(),
        fetchFactionRepuations(),
      ]);

      this.skills = skills
        .map(({ id, ...rest }) => {
          return { id, ...rest, value: id };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      this.skillsMap = Object.fromEntries(
        skills.map(({ id, icon, name }) => [id, { icon, name }])
      );
      this.skillLevels = Object.fromEntries(
        skills.map(({ id }) => [id, playerStats[id] ?? 1])
      );
      this.setAchievementPoints(playerStats.achievementPoints ?? 0);

      this.factions = factions
        .filter(({ reputation }) => reputation !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.factionReputation = Object.fromEntries(
        factions.map(({ reputation }) => [
          reputation,
          factionReputations[reputation] ?? 0,
        ])
      );

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
