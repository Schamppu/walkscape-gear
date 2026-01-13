<script setup>
import { computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";
import { useGearStore } from "@/store/gear";
import GearSetDropdown from "./GearSetDropdown.vue";
import TagSelection from "./TagSelection.vue";

const gearSetStore = useGearSetStore();
const gearStore = useGearStore();

// Computed properties
const hasUnsavedChanges = computed(() => gearSetStore.hasUnsavedChanges);

const canSave = computed(() => {
  const hasGear = gearStore.hasGearEquipped;
  return gearSetStore.canSaveWithGear(hasGear);
});

// Current set tags for editing
const currentSetTags = computed({
  get: () => gearSetStore.currentSet.tags,
  set: (value) => gearSetStore.updateCurrentSetTags(value),
});

const getSetItems = () => {
  const excluded = ["consumable", "potion", "service"];
  return Object.entries(gearStore.selectedGearset)
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
    const currentGearItems = getSetItems();

    // Save to backend (passing gear items directly)
    await gearSetStore.saveCurrentSet(currentGearItems);
  } catch (error) {
    console.error("Failed to save gear set:", error);
  }
}
</script>

<template>
  <div class="gear-set-manager">
    <!-- Current Set Info and Controls -->
    <div class="current-set-section">
      <div class="row">
        <button
          class="button save-button"
          @click="handleSaveGearSet"
          :disabled="!canSave"
          :class="{ 'has-changes': hasUnsavedChanges }"
        >
          Save
        </button>
        <gear-set-dropdown />
      </div>

      <!-- Current Set Tag Editor -->

      <tag-selection v-model="currentSetTags" label="Tags:" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.gear-set-manager {
  display: flex;
  flex-direction: column;
  gap: $md;
}

.current-set-section {
  display: flex;
  flex-direction: column;
  gap: $sm;

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
  color: $txPrimary;

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

.save-button {
  font-weight: 500;
}
</style>
