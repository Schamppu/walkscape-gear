<script setup lang="ts">
import { computed } from "vue";
import { n } from "@/utils/number";
import type { SearchProgress } from "@/domain/advancedOptimiser/search";

const props = defineProps<{
  /** Latest progress report; `null` until the first one arrives. */
  progress: SearchProgress | null;
  timeBudgetMs: number;
}>();

const fraction = computed(() =>
  props.progress ? Math.min(1, props.progress.elapsedMs / props.timeBudgetMs) : 0,
);

const improvement = computed(() => {
  if (!props.progress) return "";
  const percent = props.progress.improvement * 100;
  return `${percent > 0 ? "+" : ""}${n(percent, 1)}%`;
});
</script>

<template>
  <div class="progress" role="status" aria-live="polite">
    <div
      class="bar"
      role="progressbar"
      :aria-valuenow="Math.round(fraction * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="fill" :style="{ width: `${fraction * 100}%` }" />
    </div>
    <p v-if="!progress">Preparing gear options…</p>
    <template v-else>
      <p v-if="progress.valid">
        Best so far: <strong>{{ improvement }}</strong> vs no gear
      </p>
      <p v-else>Looking for a set that meets the activity's requirements…</p>
      <p class="detail">{{ n(progress.evaluations, 0) }} sets tried</p>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $xxs;

  p {
    margin: 0;
  }
}

.bar {
  width: 100%;
  height: 0.375rem;
  border-radius: $xs;
  background: $boxTransparentDarkOutline;
  overflow: hidden;

  .fill {
    height: 100%;
    background: $txPositive;
    transition: width 0.2s linear;
  }
}

.detail {
  opacity: 0.7;
  font-size: 0.875em;
}
</style>
