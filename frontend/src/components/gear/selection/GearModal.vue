<script setup>
import BaseModal from "@/components/common/BaseModal.vue";
import { useGearStore } from "@/store/gear";
import { useUrlStore } from "@/store/url";
import GearPreview from "./GearPreview.vue";
import GearSearch from "./GearSearch.vue";

const props = defineProps({
  gearType: {
    type: String,
    required: true,
  },
  slotName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:visible"]);

const gearStore = useGearStore();
const urlStore = useUrlStore();

const closeDialog = () => {
  emit("update:visible", false);
};

const handleSelectItem = async (item) => {
  if (props.gearType === "activityInput") {
    gearStore.setGearSlot(props.slotName, item);
  } else {
    await gearStore.loadItem(props.slotName, item.id, item.quality);
  }

  urlStore.encodeAndPushToUrl();
  closeDialog();
};

const unequipItem = (slotName) => {
  gearStore.setGearSlot(slotName, null);

  urlStore.encodeAndPushToUrl();
};

const slotTitle = (slotName) => {
  return slotName.replace(/([a-zA-Z])(\d+)/, "$1 $2");
};
</script>

<template>
  <base-modal
    :model-value="true"
    bottom-sheet
    height="80dvh"
    width="90vw"
    max-width="450px"
    min-width=""
    min-height=""
    :show-close-button="false"
    no-padding
    @close="closeDialog"
  >
    <template #header>
      <div class="spacer"></div>
      <h2 class="title">{{ slotTitle(slotName) }}</h2>
      <button class="close-button" @click="closeDialog">x</button>
    </template>

    <div class="content">
      <gear-preview
        v-if="gearStore.slotFilled(props.slotName)"
        :gear-type="gearType"
        :slot-name="slotName"
        @unequip="unequipItem(slotName)"
        @close="closeDialog"
      />
      <gear-search
        :gear-type="gearType"
        :slot-name="slotName"
        :show-close="!gearStore.slotFilled(props.slotName)"
        @select-item="handleSelectItem"
        @close="closeDialog"
      />
    </div>
  </base-modal>
</template>

<style lang="scss" scoped>
.spacer {
  width: 48px;
  flex-shrink: 0;
}

.title {
  flex: 1;
  text-align: center;
  margin: 0;
  text-transform: capitalize;
}

.close-button {
  background-color: $boxDarkBackground;
  padding: $base $base $xs;
  border: none;
  cursor: pointer;
  color: $txPrimary;
  width: 48px;
  flex-shrink: 0;

  &:hover,
  &:focus {
    background-color: $boxDarkOutline;
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $sm;
}
</style>
