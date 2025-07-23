<script setup>
import { computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";
import { useGearStore } from "@/store/gear";
import GearSetDropdown from "./GearSetDropdown.vue";

const gearSetStore = useGearSetStore();
const gearStore = useGearStore();

// Get current set data from store
const currentSet = computed(() => gearSetStore.getCurrentSet);
const hasUnsavedChanges = computed(() => gearSetStore.hasUnsavedChanges);

const canSave = computed(() => {
  const hasGear = gearStore.hasGearEquipped;
  return gearSetStore.canSaveWithGear(hasGear);
});

const getSetItems = () => {
  const excluded = ["consumable", "potion", "service"];
  return Object.entries(gearStore.gearSlots)
    .filter(([slot, item]) => !excluded.includes(slot) && item)
    .map(([slot, item]) => {
      const match = slot.match(/^([a-zA-Z]+)(\d+)?$/);
      const [slotType, slotIndex] = match
        ? [match[1], match[2] - 1 || 0]
        : ["", ""];

      return {
        slot,
        slotType,
        slotIndex,
        itemId: item?.id || null,
        quality: item?.quality || null,
      };
    });
};

async function handleSaveGearSet() {
  try {
    // Capture current gear configuration
    const currentGearItems = getSetItems();

    // Save to backend (passing gear items directly)
    await gearSetStore.saveCurrentSet(currentGearItems);

    // Could show success notification here
    console.log("Gear set saved successfully!");
  } catch (error) {
    console.error("Failed to save gear set:", error);
    // Could show error notification here
  }
}
</script>

<template>
  <div class="gear-set-manager">
    <div class="row">
      <button
        class="button"
        @click="handleSaveGearSet"
        :disabled="!canSave"
        :class="{ 'has-changes': hasUnsavedChanges }"
      >
        Save
      </button>
      <gear-set-dropdown />
    </div>
  </div>
</template>

<style scoped lang="scss">
.gear-set-manager {
  display: flex;
  flex-direction: column;
  gap: $base;

  .row {
    display: flex;
    align-items: center;
    gap: $base;
  }
}

.button {
  cursor: pointer;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;
  padding: $sm $xlg;

  &:hover:not(:disabled) {
    background-color: $boxTransparentDarkBackground;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.has-changes {
    border-color: $txPositive;
    color: $txPositive;
  }
}

.current-set-info {
  padding: $sm;
  background-color: $boxTransparentDarkBackground;
  border-radius: $sm;
  border: 1px solid $boxDarkOutline;
}

.set-details {
  color: $txPrimary;
  font-weight: 500;

  .unsaved-indicator {
    color: $txPositive;
    font-weight: bold;
  }
}

.set-tags {
  color: $txDarker;
  font-size: $sm;
  margin-top: $xxs;
}
</style>
