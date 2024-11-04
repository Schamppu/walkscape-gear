<script setup>
import { computed, ref, onUnmounted, watch } from "vue";
import { getIcon } from "@/utils/axios/icons"; // Update with the correct path

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
const iconSrc = ref(null);
const loading = ref(true);

// Fetch the icon URL when component mounts or iconPath changes
const fetchIcon = async () => {
  loading.value = true;
  try {
    const response = await getIcon({ path: props.iconPath });
    iconSrc.value = URL.createObjectURL(response.data);
  } catch (error) {
    console.error("Failed to load icon:", error);
    iconSrc.value = "/nac_shop.png"; // Fallback image in case of an error
  }
  loading.value = false;
};

fetchIcon();

// Cleanup object URL on component unmount to prevent memory leaks
onUnmounted(() => {
  if (iconSrc.value) {
    URL.revokeObjectURL(iconSrc.value);
  }
});

// Map size options to pixel values
const iconSize = computed(() => {
  const sizeMap = {
    xs: "16px",
    sm: "24px",
    md: "32px",
    lg: "48px",
    xl: "64px",
    xxl: "96px",
    default: "32px",
  };
  return sizeMap[props.size];
});
watch(() => props.iconPath, fetchIcon);
</script>

<template>
  <div
    v-loading="loading"
    :style="{ width: iconSize, height: iconSize }"
    class="ws-icon"
  >
    <img
      :src="iconSrc"
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