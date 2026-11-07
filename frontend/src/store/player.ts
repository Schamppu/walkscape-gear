import { defineStore } from "pinia";
import { markRaw } from "vue";
import type { Skill, Faction, StatDefinition } from "@/domain/types";
import type { StaticBootstrap, UserBootstrap } from "@/domain/types/bootstrap";
import { useNotificationStore } from "@/store/notifications";

export type SkillOption = Skill & { value: string };

export type SkillInfo = Pick<Skill, "icon" | "name" | "type" | "typeIcon">;

export type FactionInfo = Pick<
  Faction,
  "icon" | "name" | "color" | "reputation"
>;

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
    totalWealth: 0,
    realmLocations: {} as Record<string, number>,
    userUuid: null as string | null,
    isLoaded: false,
  }),
  actions: {
    hydrate({ skills, factions }: Pick<StaticBootstrap, "skills" | "factions">): void {
      this.skills = markRaw(skills
        .map(({ id, ...rest }) => {
          return { id, ...rest, value: id };
        })
        .sort((a, b) => a.name.localeCompare(b.name)));
      this.skillsMap = markRaw(Object.fromEntries(
        skills.map(({ id, icon, name, type, typeIcon }) => [
          id,
          { icon, name, type, typeIcon },
        ]),
      ));

      // Copy before sorting: the bundle's factions array is shared with the data store.
      this.factions = markRaw([...factions].sort((a, b) => a.name.localeCompare(b.name)));
      const hiddenReputation = new Set([
        "wallisiaReputation",
        "wrentmarkReputation",
      ]);
      this.reputationFactions = markRaw(this.factions.filter(
        ({ reputation }) =>
          reputation !== null && !hiddenReputation.has(reputation),
      ));
      this.factionsMap = markRaw(Object.fromEntries(
        factions.map(({ id, icon, name, color, reputation }) => [
          id,
          { icon, name, color, reputation },
        ]),
      ));
    },
    /** Applies the player's saved stats. Requires `hydrate` to have run first. */
    hydrateUser({
      userStats: playerStats,
      factionReputations,
    }: Pick<UserBootstrap, "userStats" | "factionReputations">): void {
      this.skillLevels = Object.fromEntries(
        this.skills.map(({ id }) => [id, playerStats[id] ?? 1]),
      );
      this.setAchievementPoints(playerStats.achievementPoints ?? 0);
      this.setTotalWealth(playerStats.totalWealth ?? 0);
      this.level = playerStats.level ?? 1;
      this.realmLocations = Object.fromEntries(
        Object.entries(playerStats)
          .filter(([key]) => key.endsWith("Locations"))
          .map(([key, value]) => [key.split("Locations")[0], value as number]),
      );
      this.factionReputation = Object.fromEntries(
        this.factions.map(({ reputation }) => [
          reputation,
          factionReputations[reputation as string] ?? 0,
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
    setTotalWealth(value: number): void {
      this.totalWealth = value;
    },
    setRealmLocations(realm: string, value: number): void {
      this.realmLocations[realm] = value;
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
