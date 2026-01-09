<script setup>
import { computed, ref, watch } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import TravelRequirementsList from "./TravelRequirementsList.vue";
import { usePlayerStore } from "@/store/player";
import { useRouteStore } from "@/store/route";
import { useRoutes } from "@/composables/useRoutes";
import useBaseContext from "@/composables/useBaseContext";
import { useRequirements } from "@/composables/useRequirements";
import { icons } from "@/constants/iconPaths";
import { n } from "@/utils/number";

const playerStore = usePlayerStore();
const routeStore = useRouteStore();
const ctx = useBaseContext();
const { getRoute, averageStepsPerRoute, stepsPerNode } = useRoutes(ctx);
const { checkRequirements, mapRequirementsText, mergeRequirements } =
  useRequirements(ctx);

const route = ref(null);

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

watch(
  [start, end, ctx.equippedGear],
  ([s, e]) => {
    if (!s || !e) return;
    const result = getRoute(s.id, e.id);
    route.value = result;
  },
  { flush: "post" }
);

const noPath = computed(() => {
  return route.value?.bestValid ? false : true;
});

const segments = computed(() => {
  if (!route.value?.bestValid) return [];
  return route.value?.bestValid.segments;
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
        tooltip: `Average steps for\n${segment.from.name} to ${
          segment.to.name
        }: ${averageStepsPerRoute(segment.distance, segment.stats)}`,
        iconPath: icons.steps,
      },
      {
        text: `${n(uncappedWorkEfficiency * 100)}%`,
        tooltip: `Work Efficiency: ${n(uncappedWorkEfficiency * 100)}%`,
        iconPath: icons.WE,
        borderClass:
          workEfficiency >= effectiveMaxWorkEfficiency - 1
            ? "border-green"
            : "",
      },
      {
        text: `${n(doubleAction * 100)}%`,
        tooltip: `Double Action: ${n(doubleAction * 100)}%`,
        iconPath: icons.DA,
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

  const getRangeText = (range, isPercent = true) => {
    const multi = isPercent ? 100 : 1;
    return range[0] !== range[1]
      ? `${n(range[0] * multi)} - ${n(range[1] * multi)}${isPercent ? "%" : ""}`
      : `${n(range[0] * multi)}${isPercent ? "%" : ""}`;
  };

  return {
    label: "Total steps (min - max steps, ~average)",
    component: InfoBubble,
    items: [
      {
        text: `${getRangeText(
          [totalMinSteps.value, totalMaxSteps.value],
          false
        )} (~${n(totalAverageSteps.value, 0)})`,
        tooltip: `Min steps: ${Math.round(
          totalMinSteps.value
        )} (best case with double action)\nMax steps: ${
          totalMaxSteps.value
        } (worst case, no double action)\nAverage steps: ${Math.round(
          totalAverageSteps.value
        )}`,
        iconPath: icons.steps,
      },
      {
        text: getRangeText(weRange),
        tooltip: getRangeText(weRange),
        iconPath: icons.WE,
      },
      {
        text: getRangeText(daRange),
        tooltip: getRangeText(daRange),
        iconPath: icons.DA,
      },
    ],
  };
});

const reqs = computed(() => {
  const segmentRequirements = segments.value.map(
    ({ requirements, context }) => {
      return { requirements, context };
    }
  );
  const requirementsActive = segmentRequirements.map(
    ({ requirements, context }) =>
      requirements.map((reqs) => checkRequirements([reqs], context))
  );

  return segmentRequirements.map(({ requirements }, idx) => {
    if (requirements.length) {
      return mapRequirementsText(requirements, requirementsActive[idx]);
    } else return [];
  });
});

const missingRequirements = computed(() => {
  if (!route.value) return [];
  const mergedReqs = mergeRequirements(route.value?.best.missing) || [];

  return mapRequirementsText(mergedReqs, [false]);
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

      <div v-if="noPath">
        <travel-requirements-list
          v-if="missingRequirements"
          title="Requirements needed for route:"
          :requirements="missingRequirements"
        />
        <p v-else>Couldn't find path</p>
      </div>

      <!-- Stats Display -->
      <div v-if="segments.length" class="info-section">
        <travel-requirements-list
          title="Faster route available with:"
          :requirements="missingRequirements"
        />
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
        <div v-for="(route, idx) in segments" :key="route[0]" class="segment">
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
          <travel-requirements-list :requirements="reqs[idx]" />
          <div class="components">
            <component
              v-for="(item, idx) in stats(route).items"
              :is="InfoBubble"
              v-bind="item"
              :key="`route-${route.to.name}-${idx}`"
            />
          </div>
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
  flex-wrap: wrap;
  align-items: center;
  gap: $xs;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;

  .components {
    display: flex;
    align-items: center;
    gap: $xs;
  }
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
  flex-wrap: wrap;

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
