<script setup>
import { ref, watch } from "vue";
import { useNotificationStore } from "@/store/notifications";
import { icons } from "@/constants/iconPaths";
import BaseModal from "@/components/common/BaseModal.vue";
import WsButton from "@/components/primitives/WsButton.vue";

const props = defineProps({
  modelValue: Boolean,
  exportCode: {
    type: String,
    default: "",
  },
});

const notificationStore = useNotificationStore();
const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
const textareaRef = ref(null);

// Watch for prop changes to sync local state
watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue;
  },
);

// Watch local state to emit changes
watch(isOpen, (newValue) => {
  emit("update:modelValue", newValue);
});

function close() {
  isOpen.value = false;
}

function selectAllText() {
  if (textareaRef.value) {
    textareaRef.value.select();
    textareaRef.value.setSelectionRange(0, 99999); // For mobile devices
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.exportCode);
    notificationStore.success("Export code copied to clipboard!");
    close();
  } catch {
    notificationStore.error("Clipboard access failed. Copy code manually.");
    selectAllText();
  }
}
</script>

<template>
  <BaseModal
    v-model="isOpen"
    title="Export Code"
    width="90%"
    max-width="600px"
    min-width="400px"
    min-height="300px"
    @close="close"
  >
    <div class="export-modal-content">
      <p class="instructions">Copy the code below to share your gear set:</p>

      <textarea
        ref="textareaRef"
        :value="exportCode"
        readonly
        class="export-textarea"
        @click="selectAllText"
      />

      <div class="button-group">
        <ws-button
          text="Copy to Clipboard"
          :icon-path="icons.deposit"
          @click="copyToClipboard"
        />
        <ws-button text="Select All" @click="selectAllText" />
        <ws-button text="Close" @click="close" />
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.export-modal-content {
  display: flex;
  flex-direction: column;
  gap: $md;
}

.instructions {
  margin: 0;
  color: $txPrimary;
  font-size: $base;
}

.export-textarea {
  width: 100%;
  min-height: 200px;
  padding: $sm;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background-color: $boxDarkBackground;
  color: $txPrimary;
  font-family: "Courier New", monospace;
  font-size: $sm;
  resize: vertical;
  white-space: pre-wrap;
  word-wrap: break-word;

  &:focus {
    outline: none;
    border-color: $txPrimary;
    background-color: $boxTransparentDarkBackground;
  }

  &::selection {
    background-color: rgba(255, 255, 255, 0.2);
  }
}

.button-group {
  display: flex;
  gap: $sm;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
