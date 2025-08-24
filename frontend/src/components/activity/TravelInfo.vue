<script setup>
import { computed, ref, watch } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import { useSkillModifiers } from "@/utils/useSkillModifiers";
import { n } from "@/utils/number";

const {
  maxWorkEfficiency,
  workEfficiency,
  uncappedWorkEfficiency,
  effectiveMaxWorkEfficiency,
  stepsRequiredFlat,
  stepsRequiredPercent,
  doubleAction,
} = useSkillModifiers();

// Local ref for route count
const routeCount = ref(1);

// Local ref array for route distances
const routeDistances = ref([1000]);

// Watch routeCount to adjust the routeDistances array
const adjustRouteDistances = () => {
  const currentCount = routeCount.value;
  const currentDistances = routeDistances.value;

  if (currentCount > currentDistances.length) {
    // Add new distances with default value of 1000
    for (let i = currentDistances.length; i < currentCount; i++) {
      currentDistances.push(1000);
    }
  } else if (currentCount < currentDistances.length) {
    // Remove excess distances
    routeDistances.value = currentDistances.slice(0, currentCount);
  }
};

// Watch for changes in routeCount
watch(routeCount, adjustRouteDistances, { immediate: true });

const stepsPerNode = (distance) => {
  const we = 1 + workEfficiency.value;
  return Math.ceil(
    Math.max(
      10,
      (distance / we / 10) * stepsRequiredPercent.value +
        stepsRequiredFlat.value
    )
  );
};

// Calculate expected number of node completions with double action
const expectedNodeCompletions = (totalNodes) => {
  const doubleActionChance = doubleAction.value;

  if (doubleActionChance === 0) {
    // No double action, need to complete all nodes
    return totalNodes;
  }

  // With double action, each completion has a chance to skip the next node
  // This creates a Markov chain where we need to calculate expected completions
  // For simplicity, we can use the approximation: totalNodes / (1 + doubleActionChance)
  // This assumes double action distributes evenly across all nodes

  return totalNodes / (1 + doubleActionChance);
};

// Calculate average steps for a single route
const averageStepsPerRoute = (distance) => {
  const stepsPerSingleNode = stepsPerNode(distance);
  const expectedCompletions = expectedNodeCompletions(10); // 10 nodes per route
  return Math.ceil(stepsPerSingleNode * expectedCompletions);
};

// Calculate total average steps across all routes
const totalAverageSteps = computed(() => {
  return routeDistances.value.reduce((total, distance) => {
    return total + averageStepsPerRoute(distance);
  }, 0);
});

// Calculate min/max steps (for range display)
const totalMinSteps = computed(() => {
  // Best case: double action triggers optimally
  const doubleActionChance = doubleAction.value;

  return routeDistances.value.reduce((total, distance) => {
    const stepsPerSingleNode = stepsPerNode(distance);
    const routeMinCompletions = doubleActionChance > 0 ? 5 : 10; // 5 if double action can trigger, 10 otherwise
    return total + stepsPerSingleNode * routeMinCompletions;
  }, 0);
});

const totalMaxSteps = computed(() => {
  // Worst case: no double action triggers
  return routeDistances.value.reduce((total, distance) => {
    return total + stepsPerNode(distance) * 10; // 10 nodes per route, no skips
  }, 0);
});

const statsRow = computed(() => ({
  label: "Travel Stats (min - max steps, ~average)",
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
      )} (expected with ${Math.round(
        doubleAction.value * 100
      )}% double action)`,
      iconPath: "assets/icons/text/general_icons/steps.png",
    },
    {
      text: `${n(uncappedWorkEfficiency.value * 100)} / ${Math.round(
        (maxWorkEfficiency.value - 1) * 100
      )}%`,
      tooltip: `Your Work Efficiency: ${Math.round(
        uncappedWorkEfficiency.value * 100
      )}%\nMax Work Efficiency: ${n((maxWorkEfficiency.value - 1) * 100, 0)}%`,
      iconPath: "assets/icons/text/stats/skilling/work_efficiency.png",
      borderClass:
        workEfficiency.value >= effectiveMaxWorkEfficiency.value - 1
          ? "border-green"
          : "",
    },
    {
      text: `${Math.round(doubleAction.value * 100)}%`,
      tooltip: `Double Action chance: ${Math.round(
        doubleAction.value * 100
      )}%\nWhen triggered, you get the next node completion for free`,
      iconPath: "assets/icons/text/stats/skilling/double_action.png",
    },
  ],
}));
</script>

<template>
  <details open>
    <summary>Travel Info</summary>

    <section :class="['travel-info', 'border-agility']">
      <p>This is still under development</p>

      <div class="route-config">
        <div class="input-group">
          <ws-label label="Route Count" />
          <select v-model.number="routeCount" class="route-select">
            <option v-for="num in 10" :key="num" :value="num">
              {{ num }}
            </option>
          </select>
        </div>
      </div>

      <!-- Route Distance Inputs -->
      <div class="route-distances">
        <ws-label label="Route Distances" />
        <div class="distance-inputs">
          <div
            v-for="(distance, index) in routeDistances"
            :key="index"
            class="input-group"
          >
            <ws-label :label="`Route ${index + 1}`" />
            <input
              v-model.number="routeDistances[index]"
              type="number"
              min="1"
              class="route-input"
              :placeholder="`Distance for route ${index + 1}`"
            />
          </div>
        </div>
      </div>

      <!-- Stats Display -->
      <div class="info-section">
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
