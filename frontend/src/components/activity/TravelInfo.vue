<script setup>
import { computed } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import WsIcon from "../common/WsIcon.vue";
import { usePlayerStore } from "@/store/player";
import { useRouteStore } from "@/store/route";
import { useRoutes } from "@/composables/useRoutes";
import { n } from "@/utils/number";

const playerStore = usePlayerStore();
const routeStore = useRouteStore();
const { getRoute, averageStepsPerRoute, stepsPerNode } = useRoutes();

const start = computed({
  get: () => routeStore.start,
  set: (val) => {
    if (val !== routeStore.start) {
      routeStore.setStart(val);
    }
  },
});

const end = computed({
  get: () => routeStore.end,
  set: (val) => {
    if (val !== routeStore.end) {
      routeStore.setEnd(val);
    }
  },
});

const noneLocation = { value: "None", items: [] };

const locationsByFaction = [
  noneLocation,
  ...playerStore.factions
    .map(({ id, name, icon }) => {
      const locs = routeStore.locations
        .filter(({ faction }) => faction === id)
        .map((loc) => {
          return { value: loc.name, ...loc };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        value: name,
        icon,
        items: locs,
      };
    })
    .filter(({ items }) => items.length > 0),
];

const routeRef = computed(() => {
  if (!(start.value && end.value)) return [];
  return getRoute(start.value.id, end.value.id);
});

const segments = computed(() => {
  if (!(start.value && end.value)) return [];
  return routeRef.value.segments;
});

const totalAverageSteps = computed(() => {
  return segments.value.reduce((total, { distance, stats }) => {
    return total + averageStepsPerRoute(distance, stats);
  }, 0);
});

const totalMinSteps = computed(() => {
  return segments.value.reduce((total, { distance, stats }) => {
    const { doubleAction } = stats;
    const stepsPerSingleNode = stepsPerNode(distance, stats);
    const routeMinCompletions = doubleAction > 0 ? 5 : 10;
    return total + stepsPerSingleNode * routeMinCompletions;
  }, 0);
});

const totalMaxSteps = computed(() => {
  return segments.value.reduce((total, { distance, stats }) => {
    return total + stepsPerNode(distance, stats) * 10;
  }, 0);
});

const stats = (segment) => {
  const {
    uncappedWorkEfficiency,
    workEfficiency,
    effectiveMaxWorkEfficiency,
    doubleAction,
  } = segment.stats;

  return {
    component: InfoBubble,
    items: [
      {
        text: `~${averageStepsPerRoute(segment.distance, segment.stats)}`,
        tooltip: "",
        iconPath: "assets/icons/text/general_icons/steps.png",
      },
      {
        text: `${n(uncappedWorkEfficiency * 100)}%`,
        tooltip: "",
        iconPath: "assets/icons/text/stats/skilling/work_efficiency.png",
        borderClass:
          workEfficiency >= effectiveMaxWorkEfficiency - 1
            ? "border-green"
            : "",
      },
      {
        text: `${n(doubleAction * 100)}%`,
        tooltip: "",
        iconPath: "assets/icons/text/stats/skilling/double_action.png",
      },
    ],
  };
};

const statsRow = computed(() => {
  const segmentStats = segments.value.map(({ stats }) => stats);
  const segmentWE = segmentStats.map(({ workEfficiency }) => workEfficiency);
  const weRange = [Math.min(...segmentWE), Math.max(...segmentWE)];

  const segmentsDA = segmentStats.map(({ doubleAction }) => doubleAction);
  const daRange = [Math.min(...segmentsDA), Math.max(...segmentsDA)];

  return {
    label: "Total steps (min - max steps, ~average)",
    component: InfoBubble,
    items: [
      {
        text: `${Math.round(totalMinSteps.value)} - ${
          totalMaxSteps.value
        } (~${Math.round(totalAverageSteps.value)})`,
        tooltip: `Min steps: ${Math.round(
          totalMinSteps.value
        )} (best case with double action)\nMax steps: ${
          totalMaxSteps.value
        } (worst case, no double action)\nAverage steps: ${Math.round(
          totalAverageSteps.value
        )}`,
        iconPath: "assets/icons/text/general_icons/steps.png",
      },
      {
        text: `${n(weRange[0] * 100)} - ${Math.round(weRange[1] * 100)}%`,
        tooltip: `${n(weRange[0] * 100)} - ${Math.round(weRange[1] * 100)}%`,
        iconPath: "assets/icons/text/stats/skilling/work_efficiency.png",
      },
      {
        text: `${n(daRange[0] * 100)} - ${Math.round(daRange[1] * 100)}%`,
        tooltip: `${n(daRange[0] * 100)} - ${Math.round(daRange[1] * 100)}%`,
        iconPath: "assets/icons/text/stats/skilling/double_action.png",
      },
    ],
  };
});

const updateStart = (location) => {
  if (location.value === "None") start.value = null;
  else start.value = location;
};

const updateEnd = (location) => {
  if (location.value === "None") end.value = null;
  else end.value = location;
};
</script>

<template>
  <details open>
    <summary>Travel Info</summary>

    <section :class="['travel-info', 'border-agility']">
      <div class="dropdowns">
        <nested-dropdown
          label="Start"
          :data="locationsByFaction"
          v-model="start"
          default-text="start location"
          @select="updateStart"
        />

        <nested-dropdown
          label="End"
          :data="locationsByFaction"
          v-model="end"
          default-text="end location"
          @select="updateEnd"
        />
      </div>

      <!-- Stats Display -->
      <div v-if="segments.length" class="info-section">
        <ws-label :label="statsRow.label" />
        <div class="info-row">
          <component
            v-for="(item, idx) in statsRow.items"
            :is="statsRow.component"
            v-bind="item"
            :key="idx"
          />
        </div>
      </div>

      <div v-if="segments.length" class="routes">
        <div v-for="route in segments" :key="route[0]" class="segment">
          <p class="route-text">
            <ws-icon :icon-path="route.from.icon" size="xs" />
            <span
              :style="{
                color: `${route.from.color}`,
              }"
            >
              {{ route.from.name }}</span
            >
            to
            <ws-icon :icon-path="route.to.icon" size="xs" />
            <span
              :style="{
                color: `${route.to.color}`,
              }"
            >
              {{ route.to.name }}</span
            >
          </p>
          <component
            v-for="(item, idx) in stats(route).items"
            :is="InfoBubble"
            v-bind="item"
            :key="`route-${route.to.name}-${idx}`"
          />
        </div>
      </div>
    </section>
  </details>
</template>

<style lang="scss" scoped>
.travel-info {
  border-radius: $md;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;
  padding: $md;
}

.routes {
  display: flex;
  flex-direction: column;
  gap: $lg;
}

.segment {
  display: flex;
  align-items: center;
  gap: $xs;
}

.route-text {
  display: flex;
  align-items: center;
  gap: $xxxs;
}

.dropdowns {
  width: 100%;
  display: flex;
  gap: $lg;

  .wrapper {
    width: 100%;
  }
}

.route-config {
  display: flex;
  flex-wrap: wrap;
  gap: $lg;
  width: 100%;
}

.route-distances {
  display: flex;
  flex-direction: column;
  gap: $sm;
  width: 100%;
}

.distance-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: $md;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: $sm;
}

.route-input {
  width: 80px;
  padding: $sm;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background-color: $boxDarkBackground;
  color: $txPrimary;
  font-size: $base;

  &:focus {
    outline: none;
    border-color: $txPrimary;
    background-color: $boxTransparentDarkBackground;
  }

  &::placeholder {
    color: $txDarker;
  }
}

.route-select {
  padding: $sm;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background-color: $boxDarkBackground;
  color: $txPrimary;
  font-size: $base;

  &:focus {
    outline: none;
    border-color: $txPrimary;
    background-color: $boxTransparentDarkBackground;
  }
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: $sm;
  align-items: flex-start;
  width: 100%;

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}
</style>
