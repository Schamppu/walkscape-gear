<script setup>
import {
  upsertPlayerStats,
  upsertFactionReputations,
} from "@/utils/axios/db_routes";
import { usePlayerStore } from "@/store/player";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import SkillLevelDisplay from "./SkillLevelDisplay.vue";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import AchievementPointDisplay from "./AchievementPointDisplay.vue";
import ItemSelection from "./ItemSelection.vue";
import ImportButton from "./ImportButton.vue";
import debounce from "@/utils/debounce";
import { argbToRgba } from "@/utils/argbToRgba";
import { XP_TABLE, levelFromXp } from "@/utils/skillXp";

const playerStore = usePlayerStore();

const postPlayerStats = () => {
  const payload = {
    ...playerStore.skillLevels,
    achievementPoints: playerStore.achievementPoints,
  };
  upsertPlayerStats(payload);
};

const updatePlayerStats = debounce(postPlayerStats, 1000);

const postFactionReputation = () => {
  const payload = {
    reputations: playerStore.factionReputation,
  };
  upsertFactionReputations(payload);
};

const updateFactionReputation = debounce(postFactionReputation, 1000);

const handleCharacterImport = (data) => {
  if (!data) return;

  const parsed_data = JSON.parse(data);

  const { skills } = parsed_data;
  if (skills) {
    for (const [skill, xp] of Object.entries(skills)) {
      const level = levelFromXp(xp);
      console.log(skill, level);
      // playerStore.setSkillLevel(skill, level);
    }
  }
};
</script>

<template>
  <tab-content-wrapper class="sections">
    <import-button @import-data="handleCharacterImport" />
    <div class="skill-bubbles">
      <skill-level-display
        v-for="skill in playerStore.skills"
        :key="skill.name"
        :skill="skill"
        @input="updatePlayerStats"
      />
      <achievement-point-display @input="updatePlayerStats" />
    </div>
    <div class="faction-bubbles">
      <icon-input-bubble
        v-for="faction in playerStore.factions"
        :key="faction.reputation"
        :id="faction.reputation"
        :icon="faction.icon"
        :get-value="(id) => playerStore.factionReputation[id]"
        :set-value="
          (id, value) => {
            playerStore.setFactionReputation(id, value);
          }
        "
        :min="0"
        :max="999"
        :default-value="0"
        :border-color="argbToRgba(faction.color)"
        @input="updateFactionReputation"
      />
    </div>
    <item-selection />
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.sections {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $xxxlg;
}

.skill-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: $md;
  row-gap: $md;
}

.faction-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: $md;
  row-gap: $md;
}
</style>
