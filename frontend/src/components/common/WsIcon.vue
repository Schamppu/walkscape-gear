<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useIconStore } from "@/store/icon";
import LoadingThrobber from "./LoadingThrobber.vue";

// Define props
const props = defineProps({
  iconPath: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    default: "default",
    validator: (value) =>
      ["xs", "sm", "md", "lg", "xl", "xxl", "default"].includes(value),
  },
});

// State variables
const iconStore = useIconStore();
const iconUrl = ref(null);
const loading = ref(true);

onMounted(async () => {
  iconUrl.value = await iconStore.loadIcon(props.iconPath);
  loading.value = false;
});

// Map size options to pixel values
const iconSize = computed(() => {
  const sizeMap = {
    xs: "16px",
    sm: "24px",
    md: "32px",
    default: "32px",
    lg: "48px",
    xl: "64px",
    xxl: "96px",
  };
  return sizeMap[props.size];
});
</script>

<template>
  <div :style="{ width: iconSize, height: iconSize }" class="ws-icon">
    <loading-throbber v-if="loading" />
    <img
      v-if="iconUrl"
      :src="iconUrl"
      :alt="iconPath"
      :style="{ width: '100%', height: '100%' }"
    />
  </div>
</template>

<style scoped>
.ws-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
</style>