<script setup>
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { usePlayerStore } from "@/store/player";
import { icons } from "@/constants/iconPaths";

const emit = defineEmits(["input"]);
const store = usePlayerStore();

const getLevel = () => store.level;
const setLevel = (_, val) => store.setCharacterLevel(val);

const maxLevel = 99;
</script>

<template>
  <icon-input-bubble
    v-if="!loading"
    id="level"
    :title="`Character level: ${store.level}`"
    :icon="icons.character"
    :min="1"
    :max="maxLevel"
    :default-value="1"
    :getValue="getLevel"
    :setValue="setLevel"
    :borderClass="''"
    @input="(value) => emit('input', value)"
  />
</template>
