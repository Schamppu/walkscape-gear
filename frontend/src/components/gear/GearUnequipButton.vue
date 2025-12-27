<script setup>
import WsButton from "@/components/common/WsButton.vue";
import { useGearStore } from "@/store/gear";
import { useNotificationStore } from "@/store/notifications";
import { icons } from "@/constants/iconPaths";

const gearStore = useGearStore();
const notificationStore = useNotificationStore();

function handleUnequip() {
  gearStore.unequipAll();
  notificationStore.success("Unequipped all gear");
}
</script>

<template>
  <ws-button
    class="unequip-button"
    text="Unequip All"
    :icon-path="icons.unequip"
    @click="handleUnequip"
  />
</template>
