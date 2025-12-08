<script setup>
import { computed } from "vue";
import {
  upsertPlayerStats,
  upsertFactionReputations,
} from "@/utils/axios/db_routes";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useNotificationStore } from "@/store/notifications";
import WsIcon from "@/components/common/WsIcon.vue";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import SkillLevelDisplay from "./SkillLevelDisplay.vue";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import AchievementPointDisplay from "./AchievementPointDisplay.vue";
import ItemSelection from "./ItemSelection.vue";
import ImportButton from "./ImportButton.vue";
import debounce from "@/utils/debounce";
import { capitalize } from "@/utils/string";
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

const playerSkills = computed(() => {
  const sortedSkills = [...playerStore.skills].sort(
    ({ type: typeA }, { type: typeB }) => {
      return typeA.localeCompare(typeB);
    }
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
      0
    );
  });

  return Object.fromEntries(
    Object.entries(skillTypes).sort(
      ([, { type: typeA }], [, { type: typeB }]) => typeB - typeA
    )
  );
});
</script>

<template>
  <tab-content-wrapper class="sections">
    <import-button @import-data="handleCharacterImport" />
    <details open>
      <summary class="typography-h4">Skills & AP</summary>

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
          <p>Achievement Points</p>
          <div class="skill-bubbles">
            <achievement-point-display @input="updatePlayerStats" />
          </div>
        </div>
      </div>
    </details>
    <details open>
      <summary class="typography-h4">Faction Reputation</summary>
      <div class="skill-type">
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
      </div>
    </details>
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
  align-items: center;
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

.faction-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: $md;
  row-gap: $md;
}
</style>
