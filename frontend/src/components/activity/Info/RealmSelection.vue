<script setup>
import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import LocationBubble from "@/components/common/LocationBubble.vue";

const activityStore = useActivityStore();

const locationOptions = computed(() => {
  const NoneLoc = {
    id: null,
    name: "None",
    icon: "",
    faction: null,
  };

  return [NoneLoc].concat(activityStore.locations);
});
</script>

<template>
  <div class="locations">
    <location-bubble
      v-for="loc in locationOptions"
      :key="loc.name"
      :location="loc"
    />
  </div>
</template>

<style lang="scss" scoped>
.locations {
  display: flex;
  flex-wrap: wrap;
}
</style>
