<script setup>
import {
  craftingQualityOptions,
  consumableQualityOptions,
} from "@/domain/constants/quality.ts";
import { computed } from "vue";

const props = defineProps({
  type: String,
  qualityOptions: Array,
});

defineEmits(["select-quality"]);

const usedQualities = computed(() => {
  if (props.type === "crafted") {
    return craftingQualityOptions;
  } else if (props.type === "consumable") {
    return consumableQualityOptions;
  } else if (props.type === "pet") {
    return props.qualityOptions;
  }
  return [];
});
</script>

<template>
  <div v-if="usedQualities.length" class="qualities">
    <button
      v-for="{ name, value } in usedQualities"
      :key="value"
      :class="[
        `color-${value}`,
        `border-${value}`,
        'border-common',
        'quality-bubble',
      ]"
      @click="$emit('select-quality', value)"
    >
      <p>{{ name }}</p>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.qualities {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  gap: $xxxxs;
  margin-bottom: $sm;
}

.quality-bubble {
  cursor: pointer;
  gap: $xs;
  border-radius: $sm;
  padding: $xxxxs $xxxs;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
