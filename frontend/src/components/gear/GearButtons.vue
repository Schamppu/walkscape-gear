<script setup>
import GearSetImport from "./GearSetImport.vue";
import GearSetExport from "./GearSetExport.vue";
import GearUnequipButton from "./GearUnequipButton.vue";
</script>

<template>
  <div class="buttons-wrapper">
    <gear-set-import />
    <gear-set-export />
    <gear-unequip-button />
  </div>
</template>

<style lang="scss" scoped>
.buttons-wrapper {
  width: 100%;

  flex-wrap: wrap;

  display: flex;
  justify-content: space-around;
  gap: $sm;
}
</style>
