<script setup lang="ts">
import BaseModal from "@/components/common/BaseModal.vue";
import TargetsTable from "./advanced/TargetsTable.vue";
import LockedSlots from "./advanced/LockedSlots.vue";
import { useAdvancedOptimiser } from "@/composables/useAdvancedOptimiser";

defineProps<{ isOpen: boolean }>();
defineEmits<{ (event: "close"): void }>();

const {
  targetContext,
  config,
  lockedSlots,
  canAddTarget,
  addTarget,
  updateTarget,
  removeTarget,
  run,
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

      <locked-slots :slots="lockedSlots" />

      <button class="optimise" :disabled="!config.targets.length" @click="run">
        Optimise
      </button>
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

.optimise {
  align-self: center;
  color: $txPositive;
  border: 1px solid $txPositive;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: $txPositiveDark;
  }
}
</style>
