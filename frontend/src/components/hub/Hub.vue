<script setup>
import { ref, onMounted } from "vue";
import { getSkills } from "@/utils/axios/api_routes";
import { fetchPlayerStats } from "@/utils/axios/db_routes";
import { usePlayerStore } from "@/store/player";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import SkillLevelDisplay from "./SkillLevelDisplay.vue";
import AchievementPointDisplay from "./AchievementPointDisplay.vue";
import ItemSelection from "./ItemSelection.vue";

const playerStore = usePlayerStore();
const skills = ref([]);

onMounted(async () => {
  const [skillsResponse, playerStatsResponse] = await Promise.all([
    getSkills(),
    fetchPlayerStats(),
  ]);

  skills.value = skillsResponse.data;

  // Initialize store
  skillsResponse.data.forEach(({ id }) => {
    playerStore.setSkillLevel(id, playerStatsResponse[id] ?? 1);
  });

  playerStore.setAchievementPoints(playerStatsResponse.achievementPoints ?? 0);
});
</script>

<template>
  <tab-content-wrapper>
    <div class="tab-content">
      <div class="skill-bubbles">
        <skill-level-display
          v-for="skill in skills"
          :key="skill.name"
          :skill="skill"
        />
        <achievement-point-display />
      </div>
    </div>
    <item-selection />
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.tab-content {
  flex-grow: 1;

  display: flex;
  flex-direction: column;
  gap: variables.$xlg;
  justify-content: center;
}

.skill-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: variables.$md;
  row-gap: variables.$md;
}
</style>