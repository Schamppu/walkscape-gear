<script setup>
import WsButton from "@/components/common/WsButton.vue";
import { useGearStore } from "@/store/gear";

const emit = defineEmits(["notification"]);
const gearStore = useGearStore();

function handleUnequip() {
  gearStore.unequipAll();
  emit("notification", "Unequipped all gear");
}
</script>

<template>
  <ws-button
    class="unequip-button"
    text="Unequip All"
    icon-path="assets/icons/text/button_icons/unequip.png"
    @click="handleUnequip"
  />
</template>
