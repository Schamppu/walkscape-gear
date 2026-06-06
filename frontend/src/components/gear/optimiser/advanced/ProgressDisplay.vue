<script setup lang="ts">
import LoadingThrobber from "@/components/primitives/LoadingThrobber.vue";

defineProps<{
  isRunning: boolean;
  progressScore: number | null;
  resultScore: number | null;
}>();
</script>

<template>
  <div v-if="isRunning || resultScore !== null" class="progress-display">
    <template v-if="isRunning">
      <loading-throbber />
      <p class="status-text">
        {{ progressScore !== null ? `Best so far: ${progressScore.toFixed(3)}` : "Starting\u2026" }}
      </p>
    </template>
    <p v-else-if="resultScore !== null" class="status-text result">
      Done &#x2014; score: {{ resultScore.toFixed(3) }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.progress-display {
  display: flex;
  align-items: center;
  gap: $sm;
  padding: $xs 0;
  margin-top: $xs;
  border-top: 1px solid $boxPrimaryOutline;
}

.status-text {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.8;

  &.result {
    color: $txPositive;
    opacity: 1;
  }
}
</style>
