<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
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

onMounted(() => {
  const onEsc = (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      closeDialog();
    }
  };
  window.addEventListener("keydown", onEsc);
  // Clean up
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", onEsc);
  });
});

const gearStore = useGearStore();
const urlStore = useUrlStore();

const closeDialog = () => {
  emit("update:visible", false);
};

const handleSelectItem = async (item) => {
  await gearStore.loadItem(props.slotName, item.id, item.quality);

  urlStore.encodeAndPushToUrl();
  closeDialog();
};

const unequipItem = (slotName) => {
  gearStore.setGearSlot(slotName, null);

  urlStore.encodeAndPushToUrl();
};

const title = (slotName) => {
  return slotName.replace(/([a-zA-Z])(\d+)/, "$1 $2");
};
</script>

<template>
  <!-- Backdrop (Overlay) -->
  <div class="backdrop" @click="closeDialog"></div>

  <!-- Modal Dialog Content -->
  <transition appear name="slide-up">
    <div class="bottom-dialog">
      <div class="header">
        <div class="spacer"></div>
        <h2 class="title">{{ title(slotName) }}</h2>
        <button class="close-button" @click="closeDialog">x</button>
      </div>
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
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: rgba(6, 12, 15, 0.5);
}

.bottom-dialog {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);

  height: 80dvh;
  width: 100%;
  max-width: 550px;
  padding: 0;
  background-color: $bgPrimary;
  border: 2px solid $boxDarkOutline;

  border-top-left-radius: $base;
  border-top-right-radius: $base;
  z-index: 1001;

  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent the entire dialog from scrolling */
}

.content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $sm;
}

/* Slide Up Transition for the Bottom Dialog */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter,
.slide-up-leave-to {
  transform: translateY(100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: $boxDarkBackground;
  border-radius: calc($sm - 2px) calc($sm - 2px) 0 0;
  border-bottom: 1px solid $boxDarkOutline;
  margin-bottom: $xxxs;

  .spacer {
    width: 48px; /* Same width as close button to balance the layout */
  }

  h2 {
    flex: 1;
    text-align: center;
    margin: 0;
  }

  .title {
    text-transform: capitalize;
  }

  .close-button {
    background-color: $boxDarkBackground;
    padding: $base $base $xs;
    border: none;
    cursor: pointer;
    color: $txPrimary;
    width: 48px; /* Fixed width for consistent spacing */

    &:hover,
    &:focus {
      background-color: $boxDarkOutline;
    }
  }
}
</style>
