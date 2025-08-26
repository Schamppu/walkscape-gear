<script setup>
import { storeToRefs } from "pinia";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import GearSelection from "./GearSelection.vue";
import GearButtons from "./GearButtons.vue";
import Stats from "../stats/StatsList.vue";
import GearSets from "./GearSets.vue";
import { useSettingsStore } from "@/store/settings";

const settingsStore = useSettingsStore();
const { gearSettings } = storeToRefs(settingsStore);
</script>

<template>
  <tab-content-wrapper>
    <details open>
      <summary>Gear Set</summary>
      <section class="gear-set">
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
        <gear-selection />
        <gear-buttons />
      </section>
    </details>
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
