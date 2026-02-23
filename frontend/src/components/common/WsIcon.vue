<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useIconStore } from "@/store/icon";
import LoadingThrobber from "./LoadingThrobber.vue";
import { iconSizeMap, type IconSizeKey } from "@/constants/iconSizes";

// Define props
const props = defineProps<{
  iconPath: string;
  size?: IconSizeKey;
  outlineClass?: string;
  extraClasses?: string[];
}>();

const sizeWithDefault = computed<IconSizeKey>(() => props.size ?? "default");

// State variables
const iconStore = useIconStore();
const iconUrl = ref<string | null>(null);
const loading = ref<boolean>(true);

const loadIcon = async (icon: string): Promise<void> => {
  loading.value = true;
  iconUrl.value = await iconStore.loadIcon(icon);
  loading.value = false;
};

watch(
  () => props.iconPath,
  (icon) => void loadIcon(icon),
  { immediate: true },
);

// Map size key to CSS pixel value
const iconSize = computed<string>(() => iconSizeMap[sizeWithDefault.value]);
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
      :class="[outlineClass, ...(props.extraClasses ?? [])]"
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
