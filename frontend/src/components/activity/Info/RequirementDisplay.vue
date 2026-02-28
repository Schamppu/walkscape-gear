<script setup>
import {
  injectBaseContext,
  injectRequirements,
} from "@/composables/context/injectShared";
import WsIcon from "@/components/common/WsIcon.vue";
import { computed } from "vue";

const props = defineProps({
  requirement: Object,
  displayType: {
    type: String,
    default: "stat",
  },
});

const ctx = injectBaseContext();
const { checkRequirements, mapRequirementsText } = injectRequirements();
const fulfilled = computed(() => checkRequirements([props.requirement], ctx));
const reqText = computed(() =>
  mapRequirementsText([props.requirement], [fulfilled.value], props.displayType)
);

const borderClass = computed(() => {
  return fulfilled.value ? "border-green" : "border-red";
});
</script>

<template>
  <div class="requirement-display">
    <p
      v-for="({ prefix, text, icon }, index) in reqText"
      :key="index"
      :class="['requirement', borderClass]"
    >
      <template v-if="prefix">{{ prefix }} </template>
      <ws-icon v-if="icon" :iconPath="icon" size="sm" />
      <span class="main-text">{{ text }}</span>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.requirement {
  display: block;
  text-align: left;
  padding: $xxxxs $xs;
  border-radius: $lg;
  color: $txLighter;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;

  :deep(.ws-icon) {
    margin-left: $xxxxs;
    vertical-align: middle;
  }

  .main-text {
    margin-left: $xxxxs;
  }
}

.border-green {
  border: 1px solid $txPositive;
}

.border-red {
  border: 1px solid $txNegative;
}
</style>
