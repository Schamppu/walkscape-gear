<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import {
  injectBaseContext,
  injectRequirements,
} from "@/composables/context/injectShared";
import WsIcon from "@/components/common/WsIcon.vue";

import { n } from "@/utils/number";

const props = defineProps({
  stat: {
    type: Object,
    required: true,
  },
  requirements: {
    type: Array,
    default: () => [],
  },
  showActiveColors: {
    type: Boolean,
    default: false,
  },
});

const dataStore = useDataStore();
const settingsStore = useSettingsStore();
const { gearSettings } = storeToRefs(settingsStore);
const ctx = injectBaseContext();
const { checkRequirements, mapRequirementsText } = injectRequirements();
const isOpen = ref(gearSettings.value.openStatRequirements.value);

const storeStat = computed(
  () => dataStore.getStatByType(props.stat.type) || props.stat,
);

const iconPath = computed(() => {
  return props.stat.customIcon || storeStat.value.icon;
});

const displayValue = computed(() => {
  const { value, isPercent } = props.stat;
  const prefix = value > 0 ? "+" : "";
  return isPercent ? `${prefix}${n(100 * value)}%` : `${prefix}${n(value)}`;
});

const requirementsActive = computed(() => {
  return props.requirements.map((req) => checkRequirements([req]));
});

const statActive = computed(() => {
  return requirementsActive.value.every((active) => active);
});

const reqs = computed(() =>
  mapRequirementsText(props.requirements, requirementsActive.value),
);

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>
<template>
  <div class="stat-requirement-display">
    <div
      v-if="!reqs || !reqs.length"
      class="stat-wrapper"
      :class="stat.isNegative ? 'negative' : 'positive'"
    >
      <span>Global </span>
      <span class="stat-value">{{ displayValue }}</span>
      <ws-icon :iconPath="iconPath" size="sm" />
      <span class="stat-name">{{ stat.name }}</span>
    </div>
    <button
      v-else
      class="stat-wrapper button"
      :class="[
        {
          negative: stat.isNegative,
          positive: !stat.isNegative,
          disabled: props.showActiveColors && !statActive,
        },
      ]"
      @click="toggle"
    >
      <span class="stat-value">{{ displayValue }}</span>
      <ws-icon :iconPath="iconPath" size="sm" />
      <span class="stat-name">{{ stat.name }}</span>
    </button>
    <div v-if="isOpen" class="requirements-list">
      <p
        v-for="({ prefix, text, icon, active }, index) in reqs"
        :key="index"
        :class="[
          'requirement',
          { disabled: props.showActiveColors && !active },
        ]"
      >
        <template v-if="prefix">{{ prefix }} </template>
        <ws-icon v-if="icon" :iconPath="icon" size="sm" />
        <span class="main-text">{{ text }}</span>
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.stat-requirement-display {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.stat-wrapper {
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

  .stat-name {
    margin-left: $xxxxs;
  }

  &.disabled {
    color: $txDarker;
  }
}

.requirements-list {
  padding: 0 $md;

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
      margin-left: $xxs;
    }

    &.disabled {
      color: $txDarker;
    }
  }
}

.button {
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
