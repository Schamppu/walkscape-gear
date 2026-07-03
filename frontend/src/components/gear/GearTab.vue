<script setup>
import { storeToRefs } from "pinia";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import Stats from "@/components/stats/StatsList.vue";
import EquippedPetAbilities from "@/components/gear/EquippedPetAbilities.vue";
import UndoRedoButtons from "@/components/common/UndoRedoButtons.vue";
import GearSelection from "./selection/GearSelection.vue";
import GearButtons from "./export/GearButtons.vue";
import GearSets from "./gearset/GearSets.vue";
import GearOptimiser from "./optimiser/GearOptimiser.vue";
import GearTabSelection from "./GearTabSelection.vue";
import { useSettingsStore } from "@/store/settings";
import { useGearStore } from "@/store/gear";
import { onMounted } from "vue";
import { useUndoRedoShortcuts } from "@/composables/useUndoRedoShortcuts";

const gearStore = useGearStore();
const settingsStore = useSettingsStore();
const { gearSettings } = storeToRefs(settingsStore);

// Initialize keyboard shortcuts
useUndoRedoShortcuts();

// Initialize history tracking when component mounts
onMounted(async () => {
  await gearStore.initializeHistoryTracking();
});
</script>

<template>
  <tab-content-wrapper>
    <gear-tab-selection />
    <details open>
      <summary>Gear Set</summary>
      <section class="gear-set">
        <gear-optimiser />
        <gear-sets />
        <div class="options">
          <label v-if="gearSettings.showOwned.display === 1">
            <input type="checkbox" v-model="gearSettings.showOwned.value" />
            Show only owned items
          </label>
          <label v-if="gearSettings.showUseful.display === 1">
            <input type="checkbox" v-model="gearSettings.showUseful.value" />
            Show items with applicable stats
          </label>
        </div>
        <undo-redo-buttons
          v-if="gearSettings.undoRedo.display === 1"
          size="small"
          variant="minimal"
          direction="horizontal"
          class="undo-redo"
        />
        <gear-selection />
        <gear-buttons />
      </section>
    </details>
    <equipped-pet-abilities />
    <details open>
      <summary>Skill Modifiers</summary>
      <stats />
    </details>
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.gear-set {
  display: flex;
  flex-direction: column;
  gap: $base;

  .options {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: $sm;
    padding: $sm 0;
  }
}
</style>
