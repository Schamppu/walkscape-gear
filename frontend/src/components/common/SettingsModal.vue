<script setup>
import { ref, watch } from "vue";
import { usePlayerStore } from "@/store/player";
import WsLabel from "./WsLabel.vue";

const props = defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(["update:modelValue", "update-uuid"]);

const playerStore = usePlayerStore();

const uuidInput = ref(playerStore.userUuid || "");
const error = ref("");

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      uuidInput.value = playerStore.userUuid || "";
      error.value = "";
    }
  }
);

function close() {
  emit("update:modelValue", false);
}

function isValidUuid(uuid) {
  // Standard UUID v4 regex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

function saveUuid() {
  if (uuidInput.value === playerStore.userUuid) {
    close();
    return;
  }
  if (!isValidUuid(uuidInput.value)) {
    error.value = "Invalid UUID format.";
    return;
  }
  emit("update-uuid", uuidInput.value);
  close();
}
</script>

<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div>
          <ws-label label="User Uuid" />
          <input
            v-model="uuidInput"
            type="text"
            class="uuid-input"
            spellcheck="false"
            autocomplete="off"
            maxlength="36"
          />
          <p>To sync data between devices, change this value to match</p>
          <button class="save-btn" @click="saveUuid">Save</button>
          <div v-if="error" class="error-msg">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(6, 12, 15, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  padding: $xxxlg;
  border-radius: $sm;
  min-width: 300px;
  min-height: 200px;
  position: relative;
}
.close-btn {
  position: absolute;
  top: $xxs;
  right: $xxs;
  background: none;
  border: none;
  font-size: $xlg;
  cursor: pointer;
}

.uuid-input {
  width: 100%;
  margin-top: $xxs;
  margin-bottom: $xxs;
  padding: $xxs;
  font-family: monospace;
  font-size: $base;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background: $bgPrimary;
  color: $txPrimary;
}
.save-btn {
  margin-bottom: $xxs;
  padding: $xxs $base;
  border-radius: $sm;
  border: 1px solid $boxDarkOutline;
  background: $boxDarkBackground;
  color: $txPrimary;
  cursor: pointer;
}
.error-msg {
  color: $txNegative;
  margin-top: $xxs;
}
</style>
