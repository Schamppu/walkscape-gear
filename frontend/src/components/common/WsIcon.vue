<script setup>
import { computed, ref, watch } from "vue";
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
      [
        "xxxs",
        "xxs",
        "xs",
        "sm",
        "md",
        "mdp",
        "lg",
        "xl",
        "xxl",
        "default",
      ].includes(value),
  },
  outlineClass: {
    type: String,
    default: "",
  },
  extraClasses: {
    type: Array,
    default: [],
  },
});

// State variables
const iconStore = useIconStore();
const iconUrl = ref(null);
const loading = ref(true);

const loadIcon = async (icon) => {
  loading.value = true;
  iconUrl.value = await iconStore.loadIcon(icon);
  loading.value = false;
};

watch(
  () => props.iconPath,
  (icon) => loadIcon(icon),
  { immediate: true }
);

// Map size options to pixel values
const iconSize = computed(() => {
  const sizeMap = {
    xxxs: "8px",
    xxs: "12px",
    xs: "16px",
    sm: "24px",
    md: "32px",
    default: "32px",
    mdp: "40px",
    lg: "48px",
    xl: "64px",
    xxl: "96px",
  };
  return sizeMap[props.size];
});
</script>

<template>
  <div
    :style="{
      width: iconSize,
      height: iconSize,
      minWidth: iconSize,
      minHeight: iconSize,
    }"
    class="ws-icon"
  >
    <loading-throbber v-if="loading" />
    <img
      v-if="iconUrl"
      :src="iconUrl"
      :alt="iconPath"
      :style="{ width: '100%', height: '100%', objectFit: 'contain' }"
      :class="[outlineClass, ...props.extraClasses]"
    />
  </div>
</template>

<style scoped>
.ws-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex: 0 0 auto;
}

.gray {
  filter: grayscale();
}
</style>
