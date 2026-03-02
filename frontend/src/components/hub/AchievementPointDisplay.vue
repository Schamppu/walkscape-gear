<script setup>
import { ref, onMounted } from "vue";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { usePlayerStore } from "@/store/player";
import { getApInfo } from "@/utils/axios/api_routes";
import { icons } from "@/constants/iconPaths";

const emit = defineEmits(["input"]);
const store = usePlayerStore();

const getAP = () => store.achievementPoints;
const setAP = (_, val) => store.setAchievementPoints(val);

const maxAP = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data: ap } = await getApInfo();
    maxAP.value = ap.total;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <icon-input-bubble
    v-if="!loading"
    id="AP"
    :title="`Achievement Points: ${store.achievementPoints}`"
    :icon="icons.AP"
    :min="0"
    :max="maxAP"
    :default-value="0"
    :getValue="getAP"
    :setValue="setAP"
    :borderClass="''"
    @input="(value) => emit('input', value)"
  />
</template>
