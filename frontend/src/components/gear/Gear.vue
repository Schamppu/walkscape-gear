<script setup>
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import GearSelection from "./GearSelection.vue";
import GearSetExport from "./GearSetExport.vue";
import Stats from "../stats/Stats.vue";
import { useGearStore } from "@/store/gear";

const gearStore = useGearStore();
</script>

<template>
  <tab-content-wrapper>
    <details open>
      <summary>Gear Set</summary>
      <section class="gear-set">
        <div class="options">
          <label>
            <input type="checkbox" v-model="gearStore.showOwned" />
            Show only owned items
          </label>
          <label>
            <input type="checkbox" v-model="gearStore.showUseful" />
            Show items with applicable stats
          </label>
        </div>
        <gear-selection />
        <gear-set-export />
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
