import { defineStore } from "pinia";
import { getSkills, getFactions } from "@/utils/axios/api_routes";
import {
  fetchPlayerStats,
  fetchFactionReputations,
} from "@/utils/axios/db_routes";

export const usePlayerStore = defineStore("playerStore", {
  state: () => ({
    level: 1,
    skills: [],
    skillsMap: {},
    skillLevels: {},
    factions: [],
    reputationFactions: [],
    factionReputation: {},
    factionsMap: {},
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
        fetchFactionReputations(),
      ]);

      this.skills = skills
        .map(({ id, ...rest }) => {
          return { id, ...rest, value: id };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      this.skillsMap = Object.fromEntries(
        skills.map(({ id, icon, name, type }) => [id, { icon, name, type }]),
      );
      this.skillLevels = Object.fromEntries(
        skills.map(({ id }) => [id, playerStats[id] ?? 1]),
      );
      this.setAchievementPoints(playerStats.achievementPoints ?? 0);
      this.level = playerStats.level ?? 1;

      this.factions = factions.sort((a, b) => a.name.localeCompare(b.name));
      const hiddenReputation = new Set([
        "wallisiaReputation",
        "wrentmarkReputation",
      ]);
      this.reputationFactions = this.factions.filter(
        ({ reputation }) =>
          reputation !== null && !hiddenReputation.has(reputation),
      );
      this.factionReputation = Object.fromEntries(
        factions.map(({ reputation }) => [
          reputation,
          factionReputations[reputation] ?? 0,
        ]),
      );
      this.factionsMap = Object.fromEntries(
        factions.map(({ id, icon, name, color, reputation }) => [
          id,
          { icon, name, color, reputation },
        ]),
      );

      this.isLoaded = true;
    },
    setCharacterLevel(value) {
      this.level = Math.min(99, value);
    },
    setSkillLevel(id, value) {
      this.skillLevels[id] = value;
    },
    setSkillLevels(levels) {
      this.skillLevels = levels;
    },
    setAchievementPoints(value) {
      this.achievementPoints = value;
    },
    setFactionReputation(reputation, value) {
      this.factionReputation[reputation] = value;
    },
    setFactionReputations(reputations) {
      this.factionReputation = reputations;
    },
    setUuid(uuid) {
      this.userUuid = uuid;
    },
  },
});
