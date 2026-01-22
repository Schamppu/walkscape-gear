<script setup>
import { ref } from "vue";
import OptimiserButtons from "./OptimiserButtons.vue";
import OptimiserModal from "./OptimiserModal.vue";
import { useOptimiser } from "@/composables/useOptimiser";

const { optimise } = useOptimiser();

const modalOpen = ref(false);

const toggleModal = (isOpen) => (modalOpen.value = isOpen);
</script>

<template>
  <div>
    <optimiser-buttons @open="toggleModal(true)" @quick-set="optimise" />
    <optimiser-modal :is-open="modalOpen" @close="toggleModal(false)" />
  </div>
</template>

<style lang="scss" scoped></style>
