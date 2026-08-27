<script setup>
import { computed } from "vue";
import { upsertPlayerStats } from "@/utils/axios/db_routes";
import { usePlayerStore } from "@/store/player";
import WsIcon from "@/components/primitives/WsIcon.vue";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import SkillLevelDisplay from "./SkillLevelDisplay.vue";
import CharacterLevelDisplay from "./CharacterLevelDisplay.vue";
import AchievementPointDisplay from "./AchievementPointDisplay.vue";
import TotalWealthDisplay from "./TotalWealthDisplay.vue";
import FactionReputations from "./FactionReputations.vue";
import RealmLocations from "./RealmLocations.vue";
import ItemSelection from "./ItemSelection.vue";
import ImportButton from "./ImportButton.vue";
import debounce from "@/utils/debounce";
import { capitalize } from "@/utils/string";
import { useCharacterImport } from "@/composables/useCharacterImport";

const playerStore = usePlayerStore();
const { importCharacter } = useCharacterImport();

const postPlayerStats = () => {
  const payload = {
    ...playerStore.skillLevels,
    level: playerStore.level,
    achievementPoints: playerStore.achievementPoints,
  };
  upsertPlayerStats(payload);
};

const updatePlayerStats = debounce(postPlayerStats, 1000);

/**
 * @param {string} data - The character data to import.
 * @param {boolean} reset - Whether to reset existing character data before importing.
 */
const handleCharacterImport = (data, reset) => {
  importCharacter(data, reset);
};

const playerSkills = computed(() => {
  const sortedSkills = [...playerStore.skills].sort(
    ({ type: typeA }, { type: typeB }) => {
      return typeA.localeCompare(typeB);
    },
  );

  const skillTypes = {};
  sortedSkills.forEach((skill) => {
    const { type, typeIcon, typeIconBig, ...rest } = skill;
    if (!(type in skillTypes)) {
      skillTypes[type] = { type, typeIcon, typeIconBig, skills: [rest] };
    } else {
      skillTypes[type].skills.push(rest);
    }
  });

  Object.values(skillTypes).forEach((type) => {
    const { skills } = type;
    type["total"] = skills.length * 99;
    type["sum"] = skills.reduce(
      (prev, { id }) => prev + playerStore.skillLevels[id],
      0,
    );
  });

  return Object.fromEntries(
    Object.entries(skillTypes).sort(
      ([, { type: typeA }], [, { type: typeB }]) => typeB - typeA,
    ),
  );
});
</script>

<template>
  <tab-content-wrapper class="sections">
    <import-button @import-data="handleCharacterImport" />
    <details open>
      <summary class="typography-h4">Character</summary>

      <div class="skills">
        <div
          v-for="{ type, sum, total, typeIcon, skills } in playerSkills"
          :key="type.type"
          class="skill-type"
        >
          <div class="type-title">
            <ws-icon :icon-path="typeIcon" size="sm" />
            <p>{{ capitalize(type) }} {{ sum }} / {{ total }}</p>
          </div>
          <div class="skill-bubbles">
            <skill-level-display
              v-for="skill in skills"
              :key="skill.name"
              :skill="skill"
              @input="updatePlayerStats"
            />
          </div>
        </div>
        <div class="skill-type">
          <p>Character</p>
          <div class="skill-bubbles">
            <character-level-display @input="updatePlayerStats" />
            <achievement-point-display @input="updatePlayerStats" />
            <total-wealth-display @input="updatePlayerStats" />
          </div>
        </div>
      </div>
    </details>
    <faction-reputations />
    <realm-locations />
    <item-selection />
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
details[open] summary {
  margin-bottom: $md;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: $xxxlg;
}

.skills {
  display: flex;
  flex-direction: column;
  gap: $lg;
}

.skill-type {
  display: flex;
  flex-direction: column;
  gap: $sm;

  .type-title {
    justify-content: center;
    display: flex;
    gap: $md;
  }
}

.skill-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: $md;
  row-gap: $md;
}
</style>
