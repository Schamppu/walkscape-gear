<script setup>
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { usePlayerStore } from "@/store/player";

const emit = defineEmits(["input"]);

defineProps({
  skill: Object,
});

const store = usePlayerStore();

const getSkill = (id) => store.skillLevels[id];
const setSkill = (id, val) => {
  store.setSkillLevel(id, val);
};
</script>

<template>
  <icon-input-bubble
    :id="skill.id"
    :title="`${skill.name} level: ${store.skillLevels[skill.id]}`"
    :icon="skill.icon"
    :min="1"
    :max="99"
    :default-value="50"
    :getValue="getSkill"
    :setValue="setSkill"
    :borderClass="`border-${skill.id}`"
    @input="(value) => emit('input', value)"
  />
</template>
