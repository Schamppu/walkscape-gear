<script setup>
import {
  upsertPlayerStats,
  upsertFactionReputations,
} from "@/utils/axios/db_routes";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import SkillLevelDisplay from "./SkillLevelDisplay.vue";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import AchievementPointDisplay from "./AchievementPointDisplay.vue";
import ItemSelection from "./ItemSelection.vue";
import ImportButton from "./ImportButton.vue";
import debounce from "@/utils/debounce";
import { argbToRgba } from "@/utils/argbToRgba";
import { processCharacterImport } from "@/utils/characterImport";

const playerStore = usePlayerStore();
const itemsStore = useItemsStore();
const notificationStore = useNotificationStore();

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
  try {
    const result = processCharacterImport(data, playerStore, itemsStore);

    let updatedSkills = false;
    let updatedAchievementPoints = false;
    let updatedItems = false;
    let updatedReputation = false;

    // Update skills if processed
    if (result.skills) {
      playerStore.setSkillLevels(result.skills);
      updatedSkills = true;
    }

    // Update achievement points if processed
    if (result.achievementPoints !== null) {
      playerStore.setAchievementPoints(result.achievementPoints);
      updatedAchievementPoints = true;
    }

    if (updatedSkills || updatedAchievementPoints) {
      postPlayerStats();
    }

    // Update reputation if processed
    if (result.reputation) {
      playerStore.setFactionReputations(result.reputation);
      postFactionReputation();
      updatedReputation = true;
    }

    // Update items if processed
    if (result.items) {
      itemsStore.batchUpdateOwnedItems(result.items);
      updatedItems = true;
    }

    // Show success notification
    const updatedSections = [];
    if (updatedSkills) updatedSections.push("skills");
    if (updatedAchievementPoints) updatedSections.push("achievement points");
    if (updatedReputation) updatedSections.push("faction reputation");
    if (updatedItems) updatedSections.push("items");

    if (updatedSections.length > 0) {
      notificationStore.success(
        `Successfully imported: ${updatedSections.join(", ")}`
      );
    } else {
      notificationStore.error("No valid data found to import");
    }
  } catch {
    notificationStore.error(
      "Failed to import character data. Please check the file format."
    );
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
        v-for="faction in playerStore.reputationFactions"
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
