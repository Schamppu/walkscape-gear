<script setup>
import { ref } from "vue";
import WsButton from "@/components/common/WsButton.vue";
import GearSetImportModal from "./GearSetImportModal.vue";
import { useGearSetExport } from "@/utils/useGearSetExport";
import { useNotificationStore } from "@/store/notifications";
import { getNewItemIds } from "@/utils/axios/api_routes";

const { importCode } = useGearSetExport();
const notificationStore = useNotificationStore();

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

async function handleImportData(data) {
  const result = importCode(data);

  if (result.success) {
    const gearSet = result.data.items
      .map(({ index, item, type }) => {
        const gearSlot = ["ring", "tool"].includes(type)
          ? `${type}${index + 1}`
          : type;
        const parsedItem = JSON.parse(item);
        return {
          gearSlot,
          item: parsedItem,
        };
      })
      .filter(({ item }) => item !== null);

    const oldGearIds = gearSet.map(({ item }) => item.id);
    const { data: newIds } = await getNewItemIds(oldGearIds);
    const newGearSet = Object.fromEntries(
      gearSet.map(({ gearSlot, item }) => {
        const newId = newIds[item.id];
        return [gearSlot, { ...item, id: newId }];
      })
    );

    notificationStore.success("Gear set imported successfully");
  } else {
    notificationStore.error(result.error);
  }
}
</script>

<template>
  <div>
    <ws-button
      text="Import"
      icon-path="assets/icons/text/button_icons/equip.png"
      @click="openModal"
    />
    <gear-set-import-modal
      v-model="showModal"
      @import-data="handleImportData"
    />
  </div>
</template>

<style lang="scss" scoped></style>
