<script setup>
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import GearSelection from "./GearSelection.vue";
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
            <input type="checkbox" v-model="gearStore.useOwned" />
            Show only owned items
          </label>
        </div>
        <gear-selection />
      </section>
    </details>
    <details open>
      <summary>Stats</summary>
      <section class="stats"></section>
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
    justify-content: center;
    gap: $sm;
    padding: $sm 0;
  }
}
</style>
