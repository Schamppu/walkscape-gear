<script setup>
import { ref } from "vue";
import WsButton from "@/components/common/WsButton.vue";
import ImportModal from "./ImportModal.vue";

const emit = defineEmits(["import-data"]);

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

function handleImportData(data) {
  emit("import-data", data);
}
</script>

<template>
  <div>
    <ws-button text="Import Data" icon-size="md" @click="openModal" />
    <import-modal v-model="showModal" @import-data="handleImportData" />
  </div>
</template>

<style lang="scss" scoped></style>
