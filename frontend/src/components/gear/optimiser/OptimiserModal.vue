<script setup>
import BaseModal from "@/components/common/BaseModal.vue";

defineProps({
  isOpen: Boolean,
});
defineEmits(["close"]);
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
    <p>Under Construction</p>
    <p>Use the quick set function for now</p>
    <p>You can set its target functionality in options</p>
    <img src="/tyomaa.png" />
  </base-modal>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(6, 12, 15, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
