<script setup lang="ts">
import { computed, toRef } from "vue";
import { iconSizeMap, type IconSizeKey } from "@/constants/iconSizes";
import { useIconLoader } from "@/composables/useIconLoader";
import LoadingThrobber from "@/components/primitives/LoadingThrobber.vue";

const props = withDefaults(
  defineProps<{
    iconPath?: string | null;
    size?: IconSizeKey;
    altText?: string;
    decorative?: boolean;
    outlineClass?: string;
    extraClasses?: string[];
  }>(),
  {
    size: "default",
    altText: "",
    decorative: true,
    outlineClass: "",
    extraClasses: () => [],
  },
);

const { iconUrl, loading } = useIconLoader(toRef(props, "iconPath"));

const iconSize = computed<string>(() => iconSizeMap[props.size]);
const imgAlt = computed<string>(() =>
  props.decorative ? "" : props.altText || "Icon",
);
const isAriaHidden = computed<boolean>(() => props.decorative);
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
    :aria-hidden="isAriaHidden"
    :aria-busy="loading"
  >
    <loading-throbber v-if="loading" aria-hidden="true" />
    <img
      v-if="iconUrl"
      :src="iconUrl"
      :alt="imgAlt"
      :style="{ width: '100%', height: '100%', objectFit: 'contain' }"
      :class="[outlineClass, ...extraClasses]"
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
