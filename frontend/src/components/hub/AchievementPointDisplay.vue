<script setup>
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { usePlayerStore } from "@/store/player";

const emit = defineEmits(['input']);
const store = usePlayerStore();

const getAP = (_) => store.achievementPoints;
const setAP = (_, val) => store.setAchievementPoints(val);
</script>

<template>
  <icon-input-bubble
    id="AP"
    icon="assets/icons/text/general_icons/achievement_point.png"
    :min="0"
    :max="233"
    :default-value="0"
    :getValue="getAP"
    :setValue="setAP"
    :borderClass="''"
    @input="(value) => emit('input', value)"
  />
</template>
