<script setup>
import { ref, watch } from "vue";
import { usePlayerStore } from "@/store/player";
import WsLabel from "../common/WsLabel.vue";
import WsButton from "../common/WsButton.vue";

const emit = defineEmits(["update-uuid"]);

const playerStore = usePlayerStore();

const uuidInput = ref(playerStore.userUuid || "");
const error = ref("");

// Reset form when component is mounted or player store changes
watch(
  () => playerStore.userUuid,
  (newUuid) => {
    uuidInput.value = newUuid || "";
    error.value = "";
  },
  { immediate: true }
);

function isValidUuid(uuid) {
  // Standard UUID v4 regex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

function saveUuid() {
  if (uuidInput.value === playerStore.userUuid) {
    return; // No change
  }
  if (!isValidUuid(uuidInput.value)) {
    error.value = "Invalid UUID format.";
    return;
  }
  error.value = "";
  emit("update-uuid", uuidInput.value);
}

function resetForm() {
  uuidInput.value = playerStore.userUuid || "";
  error.value = "";
}
</script>

<template>
  <div class="user-settings">
    <ws-label label="Optimizer User ID" />
    <input
      v-model="uuidInput"
      type="text"
      class="uuid-input"
      spellcheck="false"
      autocomplete="off"
      maxlength="36"
      @keyup.enter="saveUuid"
    />
    <p class="description">
      This ID is only used by this tool. Change it to match between devices, to
      sync your optimizer data.
    </p>
    <div class="actions">
      <ws-button @click="saveUuid" text="Save" />
      <ws-button @click="resetForm" text="Reset" variant="secondary" />
    </div>
    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<style lang="scss" scoped>
.user-settings {
  display: flex;
  flex-direction: column;
  gap: $sm;
}

.uuid-input {
  width: 100%;
  padding: $sm;
  font-family: monospace;
  font-size: $base;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background: $bgPrimary;
  color: $txPrimary;

  &:focus {
    outline: none;
    border-color: var(--color-primary, $boxDarkOutline);
  }
}

.description {
  font-size: 0.9em;
  color: var(--color-text-secondary, $txPrimary);
  margin: 0;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: $sm;
  margin-top: $xs;
}

.error-msg {
  color: $txNegative;
  font-size: 0.9em;
  margin-top: $xs;
}
</style>
