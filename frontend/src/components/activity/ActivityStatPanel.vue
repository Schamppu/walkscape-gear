<script setup>
import { ref, watch } from "vue";
import { useActivityStore } from "@/store/activity";
import { getActivity } from "@/utils/axios/api_routes";
import ActivityInfoCard from "./ActivityInfoCard.vue";

const activityStore = useActivityStore();
const activityData = ref(null);
const loading = ref(true);

const loadActivity = async (activityId) => {
  loading.value = true;
  try {
    const response = await getActivity({ id: activityId });
    activityData.value = response.data;
  } catch (error) {
    console.error("Failed to load activity:", error);
    activityData.value = null;
  }
  loading.value = false;
};

loadActivity(activityStore.activity.value);
watch(() => activityStore.activity.value, loadActivity);
</script>

<template>
  <div class="activity-wrapper" v-loading="loading" v-if="!loading">
    <activity-info-card :activity-info="activityData" />
  </div>
</template>

<style lang="scss" scoped>

.activity-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  padding: $md;
  border-radius: $md;
  background-color: $boxTransparentDarkBackground;
  border: 2px solid $boxTransparentDarkOutline;
}
</style>