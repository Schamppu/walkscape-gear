<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useSettingsStore } from "@/store/settings";
import { useRequirements } from "@/utils/useRequirements";
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

const activityStore = useActivityStore();
const dataStore = useDataStore();
const itemsStore = useItemsStore();
const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const { gearSettings } = storeToRefs(settingsStore);
const { checkRequirements } = useRequirements();
const isOpen = ref(gearSettings.value.openStatRequirements.value);

const storeStat = computed(
  () => dataStore.getStatByType(props.stat.type) || props.stat
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
  props.requirements.map((req, idx) => {
    const { type, opposite, requirement } = req;
    let out;
    if (type === "mainSkill") {
      const skill = playerStore.skillsMap[requirement.skill];
      out = {
        prefix: `While${opposite ? " NOT" : ""}`,
        text: skill.name,
        icon: skill.icon,
      };
    } else if (type === "traveling") {
      out = {
        prefix: `While${opposite ? " NOT" : ""}`,
        text: "Traveling",
        icon: "",
      };
    } else if (type === "locationHasKeywords") {
      out = requirement.keywords
        .map(dataStore.getKeywordById)
        .filter(Boolean)
        .map(({ name, icon }) => ({
          prefix: `While${opposite ? " NOT" : ""} in`,
          text: `${name} location`,
          icon,
        }))[0];
    } else if (type === "realm") {
      const realm = playerStore.factionsMap[requirement.realm];
      out = {
        prefix: `While${opposite ? " NOT" : ""} in`,
        text: `${realm.name} area`,
        icon: realm.icon,
      };
    } else if (type === "distinctKeywordItemsEquipped") {
      const { quantity } = requirement;
      out = requirement.keywords
        .map(dataStore.getKeywordById)
        .filter(Boolean)
        .map(({ name, icon }) => ({
          prefix: `While${opposite ? " NOT" : ""} wearing ${quantity}`,
          text: name,
          icon,
        }))[0];
    } else if (type === "achievementPoint") {
      out = {
        prefix: "Have",
        text: `${requirement.value} achievement points`,
        icon: "assets/icons/text/general_icons/achievement_point.png",
      };
    } else if (type === "historyData") {
      if (requirement.category === "stepsWalkedActivity") {
        // Not used anymore
        const activity = activityStore.activitiesMap[requirement.data];
        out = {
          prefix: `Have taken ${requirement.value} steps on the`,
          text: `${activity.name} activity`,
          icon: activity.icon,
        };
      } else if (requirement.category === "actionCompleted") {
        const activity = activityStore.activitiesMap[requirement.data];
        out = {
          prefix: `Have completed`,
          text: `${activity.name} activity ${requirement.value} times`,
          icon: activity.icon,
        };
      }
    } else if (type === "skillLevel") {
      const skill = playerStore.skillsMap[requirement.skill];
      out = {
        prefix: `While at least ${requirement.level}`,
        text: skill.name,
        icon: skill.icon,
      };
    } else if (type === "totalSkillLevelUps") {
      const skillLevels = Object.values(playerStore.skillLevels).reduce(
        (a, b) => a + b - 1,
        0
      );

      out = {
        text: `Level up your skills ${Math.min(
          skillLevels,
          requirement.levels
        )}/${requirement.levels} times`,
      };
    } else if (type === "activityType") {
      const activity = activityStore.activitiesMap[requirement.activity];
      if (activity) {
        out = {
          prefix: `While${opposite ? " NOT" : ""} doing`,
          text: `${activity.name} activity`,
          icon: activity.icon,
        };
      }
    } else if (type === "itemAnywhere") {
      const { item: itemID } = requirement;
      const item = itemsStore.allItems[itemID];
      if (item) {
        out = {
          prefix: `Own a`,
          text: item.name,
          icon: item.icon,
        };
      }
    }
    if (out) {
      const active = requirementsActive.value[idx];
      return {
        ...out,
        active,
      };
    }
    return {
      text: requirement,
      icon: "",
    };
  })
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
      <span>Global</span>
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
        <span>{{ text }}</span>
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

  &.negative.disabled {
    color: $txNegativeDark;
  }

  &.positive {
    color: $txPositive;
  }

  &.positive.disabled {
    color: $txPositiveDark;
  }

  &.disabled {
    color: $txDarker;
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
    color: $txLighter;

    background-color: $boxDarkBackground;
    border: 1px solid $boxDarkOutline;

    ws-icon {
      display: inline;
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
