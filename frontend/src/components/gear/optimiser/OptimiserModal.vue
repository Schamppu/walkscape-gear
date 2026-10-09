<script setup lang="ts">
import BaseModal from "@/components/common/BaseModal.vue";
import TargetsTable from "./advanced/TargetsTable.vue";
import LockedSlots from "./advanced/LockedSlots.vue";
import ProgressDisplay from "./advanced/ProgressDisplay.vue";
import ResultSummary from "./advanced/ResultSummary.vue";
import { useAdvancedOptimiser } from "@/composables/useAdvancedOptimiser";

defineProps<{ isOpen: boolean }>();
defineEmits<{ (event: "close"): void }>();

const {
  targetContext,
  config,
  lockedSlots,
  unusableLockedSlots,
  canAddTarget,
  addTarget,
  updateTarget,
  removeTarget,
  running,
  progress,
  lastRun,
  timeBudgetMs,
  run,
  cancel,
  finish,
  canExportJob,
  exportJob,
} = useAdvancedOptimiser();
</script>

<template>
  <base-modal
    :model-value="isOpen"
    title="Gear Set Optimiser"
    width="80%"
    max-width="600px"
    min-height="600px"
    @update:model-value="$emit('close')"
  >
    <p v-if="!config" class="empty">Select an activity or recipe first</p>

    <div v-else class="optimiser">
      <section>
        <div class="section-header">
          <h3>Targets</h3>
          <button class="border-common" :disabled="!canAddTarget" @click="addTarget">
            + Add target
          </button>
        </div>
        <targets-table
          :targets="config.targets"
          :context="targetContext"
          @update="updateTarget"
          @remove="removeTarget"
        />
      </section>

      <locked-slots :slots="lockedSlots" :unusable="unusableLockedSlots" />

      <section class="run">
        <div v-if="running" class="run-buttons">
          <button class="optimise" :disabled="!progress" @click="finish">
            Finish now
          </button>
          <button class="cancel" @click="cancel">Cancel</button>
        </div>
        <p v-if="!running && unusableLockedSlots.length" class="warning" role="status">
          Planning around locked items you can't equip yet. Results assume you can.
        </p>
        <button
          v-if="!running"
          class="optimise"
          :disabled="!config.targets.length"
          @click="run"
        >
          Optimise
        </button>
        <button v-if="canExportJob && !running" class="border-common" @click="exportJob">
          Export job (debug)
        </button>

        <progress-display
          v-if="running"
          :progress="progress"
          :time-budget-ms="timeBudgetMs"
        />
        <result-summary
          v-else-if="lastRun"
          :result="lastRun.result"
          :targets="lastRun.targets"
          :applied="lastRun.applied"
          :location-name="lastRun.locationName"
        />
      </section>
    </div>
  </base-modal>
</template>

<style lang="scss" scoped>
.optimiser {
  display: flex;
  flex-direction: column;
  gap: $lg;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $md;
}

h3 {
  margin: 0 0 $xs;
}

.empty {
  opacity: 0.7;
}

button {
  cursor: pointer;
  border-radius: $sm;
  padding: $xxs $xs;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: $boxTransparentDarkOutline;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}

.run {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $md;
}

.run-buttons {
  display: flex;
  gap: $md;
}

.warning {
  margin: 0;
  color: $txNegative;
  text-align: center;
}

.cancel {
  color: $txNegative;
  border: 1px solid $txNegative;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: $txNegativeDark;
  }
}

.optimise {
  color: $txPositive;
  border: 1px solid $txPositive;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: $txPositiveDark;
  }
}
</style>
