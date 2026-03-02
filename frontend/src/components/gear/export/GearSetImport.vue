<script setup>
import { ref } from "vue";
import WsButton from "@/components/primitives/WsButton.vue";
import GearSetImportModal from "./GearSetImportModal.vue";
import { injectBaseContext } from "@/composables/context/injectShared";
import { useGearSetExport } from "@/composables/useGearSetExport";
import { icons } from "@/constants/iconPaths";
import { useNotificationStore } from "@/store/notifications";
import { useGearStore } from "@/store/gear";
import { useUrlStore } from "@/store/url";
import { getNewItemIds } from "@/utils/axios/api_routes";

const ctx = injectBaseContext();
const { importCode } = useGearSetExport(ctx);
const notificationStore = useNotificationStore();
const gearStore = useGearStore();
const urlStore = useUrlStore();

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

async function handleImportData(data) {
  const result = importCode(data);

  if (result.success) {
    const gearSet = result.data.items.map(({ index, item, type }) => {
      const gearSlot = ["ring", "tool"].includes(type)
        ? `${type}${index + 1}`
        : type;
      const parsedItem = JSON.parse(item);
      return {
        gearSlot,
        item: parsedItem,
      };
    });

    const oldGearIds = gearSet
      .filter(({ item }) => item !== null)
      .map(({ item }) => item.id);
    const { data: newIds } = await getNewItemIds(oldGearIds);
    const newGearSet = Object.fromEntries(
      gearSet.map(({ gearSlot, item }) => {
        if (item === null) return [gearSlot, null];
        const newId = newIds[item.id];
        return [gearSlot, { ...item, id: newId }];
      }),
    );

    await gearStore.equipMultiple(newGearSet, false);
    urlStore.encodeAndPushToUrl();

    notificationStore.success("Gear set imported successfully");
  } else {
    notificationStore.error(result.error);
  }
}
</script>

<template>
  <div>
    <ws-button text="Import" :icon-path="icons.equip" @click="openModal" />
    <gear-set-import-modal
      v-model="showModal"
      @import-data="handleImportData"
    />
  </div>
</template>

<style lang="scss" scoped></style>
