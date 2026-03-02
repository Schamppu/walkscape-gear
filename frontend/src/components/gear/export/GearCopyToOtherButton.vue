<script setup>
import WsButton from "@/components/primitives/WsButton.vue";
import { useGearStore } from "@/store/gear";
import { useGearSetStore } from "@/store/gearSet";
import { useNotificationStore } from "@/store/notifications";
import { icons } from "@/constants/iconPaths";

const gearStore = useGearStore();
const gearSetStore = useGearSetStore();

const notificationStore = useNotificationStore();

const changeTab = () => {
  const newIdx = gearStore.gearSetIndex === 0 ? 1 : 0;
  gearStore.gearSetIndex = newIdx;
  gearSetStore.gearSetIndex = newIdx;
};

const copyToOther = () => {
  const set = gearStore.selectedGearset;
  changeTab();
  gearStore.equipMultiple(set);

  notificationStore.success("Copied set");
};
</script>

<template>
  <ws-button
    class="copy-other-button"
    text="Copy To Other Set"
    :icon-path="icons.switch"
    @click="copyToOther"
  />
</template>
