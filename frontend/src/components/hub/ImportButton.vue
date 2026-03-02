<script setup>
import { ref } from "vue";
import WsButton from "@/components/primitives/WsButton.vue";
import ImportModal from "./ImportModal.vue";

const emit = defineEmits(["import-data"]);

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

function handleImportData(data, reset) {
  emit("import-data", data, reset);
}
</script>

<template>
  <div class="import-wrapper">
    <ws-button text="Import Data" icon-size="md" @click="openModal" />
    <import-modal v-model="showModal" @import-data="handleImportData" />
  </div>
</template>

<style lang="scss" scoped>
.import-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
