import { defineStore } from "pinia";
import { getSkills, getFactions } from "@/utils/axios/api_routes";
import {
  fetchPlayerStats,
  fetchFactionReputations,
} from "@/utils/axios/db_routes";
import type { Skill, Faction, StatDefinition } from "@/domain/types";
import { useNotificationStore } from "@/store/notifications";

export type SkillOption = Skill & { value: string };

export type SkillInfo = Pick<Skill, "icon" | "name" | "type">;

export type FactionInfo = Pick<Faction, "icon" | "name" | "color" | "reputation">;

export const usePlayerStore = defineStore("playerStore", {
  state: () => ({
    level: 1,
    skills: [] as SkillOption[],
    skillsMap: {} as Record<string, SkillInfo>,
    skillLevels: {} as Record<string, number>,
    factions: [] as Faction[],
    reputationFactions: [] as Faction[],
    factionReputation: {} as Record<string, number>,
    factionsMap: {} as Record<string, FactionInfo>,
    stats: [] as StatDefinition[],
    achievementPoints: 0,
    userUuid: null as string | null,
    isLoaded: false,
  }),
  actions: {
    async fetchPlayerData(): Promise<void> {
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
          factionReputations[reputation as string] ?? 0,
        ]),
      );
      this.factionsMap = Object.fromEntries(
        factions.map(({ id, icon, name, color, reputation }) => [
          id,
          { icon, name, color, reputation },
        ]),
      );

      this.isLoaded = true;
      const notificationStore = useNotificationStore();
      void notificationStore.debug(
        `Player: loaded ${this.skills.length} skills, ${this.factions.length} factions (${this.reputationFactions.length} with reputation), level ${this.level}`,
      );
    },
    setCharacterLevel(value: number): void {
      this.level = Math.min(99, value);
    },
    setSkillLevel(id: string, value: number): void {
      this.skillLevels[id] = value;
    },
    setSkillLevels(levels: Record<string, number>): void {
      this.skillLevels = levels;
    },
    setAchievementPoints(value: number): void {
      this.achievementPoints = value;
    },
    setFactionReputation(reputation: string, value: number): void {
      this.factionReputation[reputation] = value;
    },
    setFactionReputations(reputations: Record<string, number>): void {
      this.factionReputation = reputations;
    },
    setUuid(uuid: string | null): void {
      this.userUuid = uuid;
    },
  },
});
