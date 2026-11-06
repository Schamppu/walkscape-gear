<script setup>
import { ref, defineAsyncComponent } from "vue";
import OptimiserButtons from "./OptimiserButtons.vue";
import { useOptimiser } from "@/composables/useOptimiser";

const OptimiserModal = defineAsyncComponent(() => import("./OptimiserModal.vue"));

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
