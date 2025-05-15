<script setup>
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { usePlayerStore } from "@/store/player";
import { upsertPlayerStats } from "@/utils/axios/db_routes";
import debounce from "@/utils/debounce";

const props = defineProps({
  skill: Object,
});

const store = usePlayerStore();

const getSkill = (id) => store.skillLevels[id];
const setSkill = (id, val) => {
  store.setSkillLevel(id, val);
  updatePlayerStats();
};

const postPlayerStats = () => {
  const payload = {
    ...store.skillLevels,
    achievementPoints: store.achievementPoints,
  };
  upsertPlayerStats(payload);
};

const updatePlayerStats = debounce(postPlayerStats, 1000);
</script>

<template>
  <icon-input-bubble
    :id="skill.id"
    :icon="skill.icon"
    :min="1"
    :max="99"
    :default-value="50"
    :getValue="getSkill"
    :setValue="setSkill"
    :borderClass="`border-${skill.id}`"
  />
</template>
