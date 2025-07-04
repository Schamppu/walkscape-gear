<script setup>
import { ref, computed } from "vue";
import { useDataStore } from "@/store/data";
import { usePlayerStore } from "@/store/player";
import WsIcon from "@/components/common/WsIcon.vue";
import { n } from "@/utils/number";

const props = defineProps({
  stat: {
    type: Object,
    required: true,
  },
  requirements: {
    type: Array,
    required: true,
  },
});

const dataStore = useDataStore();
const playerStore = usePlayerStore();
const isOpen = ref(false);

const storeStat = computed(
  () => dataStore.getStatByType(props.stat.type) || props.stat
);

const displayValue = computed(() => {
  const { value, isPercent } = props.stat;
  const prefix = value > 0 ? "+" : "";
  return isPercent ? `${prefix}${n(100 * value)}%` : `${prefix}${n(value)}`;
});

const reqs = props.requirements.map((req) => {
  const { type, opposite, requirement } = req;
  console.log("type", type);
  if (type === "mainSkill") {
    const skill = playerStore.skillsMap[requirement.skill];
    return {
      text: skill.name,
      icon: skill.icon,
      opposite,
    };
  } else if (type === "traveling") {
    return {
      text: "Traveling",
      icon: "",
      opposite,
    };
  } else if (type === "locationHasKeywords") {
    return requirement.keywords
      .map(dataStore.getKeywordById)
      .filter(Boolean)
      .map(({ name, icon }) => ({
        text: name,
        icon,
        opposite,
      }))[0];
  } else if (type === "realm") {
    const realm = playerStore.factionsMap[requirement.realm];
    return {
      prefix: "in",
      text: `${realm.name} area`,
      icon: realm.icon,
      opposite,
    };
  } else if (type === "distinctKeywordItemsEquipped") {
    const { quantity } = requirement;
    return requirement.keywords
      .map(dataStore.getKeywordById)
      .filter(Boolean)
      .map(({ name, icon }) => ({
        prefix: `wearing ${quantity}`,
        text: name,
        icon,
        opposite,
      }))[0];
  } else if (type === "achievementPoint") {
    return {
      prefix: "have",
      text: `${requirement.value} achievement points`,
      icon: "assets/icons/text/general_icons/achievement_point.png",
      opposite,
    };
  }
  return {
    text: requirement,
    icon: "",
    opposite,
  };
});

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>
<template>
  <div class="stat-requirement-display">
    <div
      v-if="!reqs.length"
      class="stat-wrapper"
      :class="stat.isNegative ? 'negative' : 'positive'"
    >
      <span>Global</span>
      <span class="stat-value">{{ displayValue }}</span>
      <ws-icon :iconPath="storeStat.icon" size="sm" />
      <span class="stat-name">{{ stat.name }}</span>
    </div>
    <button
      v-else
      class="stat-wrapper button"
      :class="stat.isNegative ? 'negative' : 'positive'"
      @click="toggle"
    >
      <span class="stat-value">{{ displayValue }}</span>
      <ws-icon :iconPath="storeStat.icon" size="sm" />
      <span class="stat-name">{{ stat.name }}</span>
    </button>
    <div v-if="isOpen" class="requirements-list">
      <p
        v-for="({ prefix, text, icon, opposite }, index) in reqs"
        :key="index"
        class="requirement"
      >
        While
        <template v-if="opposite">NOT </template>
        <template v-if="prefix">{{ prefix }} </template>
        <ws-icon v-if="icon" :iconPath="icon" size="sm" />
        {{ text }}
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
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-content: center;
  padding: $xxxxs $xs;
  gap: $xxs;
  border-radius: $lg;
  box-sizing: border-box;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;

  &.negative {
    color: $txNegative;
  }

  &.positive {
    color: $txPositive;
  }
}

.requirements-list {
  padding: 0 $md;

  .requirement {
    display: flex;
    justify-content: flex-start;
    text-align: left;
    align-items: center;
    padding: $xxxxs $xs;
    gap: $xxs;
    border-radius: $lg;
    flex-wrap: wrap;

    background-color: $boxDarkBackground;
    border: 1px solid $boxDarkOutline;

    ws-icon {
      display: inline;
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
