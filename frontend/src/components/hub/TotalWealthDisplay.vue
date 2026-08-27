<script setup>
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { usePlayerStore } from "@/store/player";
import { icons } from "@/constants/iconPaths";

const emit = defineEmits(["input"]);
const store = usePlayerStore();

const getWealth = () => store.totalWealth;
const setWealth = (_, val) => store.setTotalWealth(val);

</script>

<template>
  <icon-input-bubble
    id="wealth"
    :title="`Total Wealth: ${store.totalWealth}`"
    :icon="icons.money"
    :min="0"
    :max="999999999"
    :default-value="0"
    :getValue="getWealth"
    :setValue="setWealth"
    :borderClass="''"
    @input="(value) => emit('input', value)"
  />
</template>
