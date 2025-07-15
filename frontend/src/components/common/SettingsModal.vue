<script setup>
import { ref, watch } from "vue";
import { usePlayerStore } from "@/store/player";
import WsLabel from "./WsLabel.vue";
import WsButton from "./WsButton.vue";
import BaseModal from "./BaseModal.vue";

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

function isValidUuid(uuid) {
  // Standard UUID v4 regex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

function saveUuid() {
  if (uuidInput.value === playerStore.userUuid) {
    emit("update:modelValue", false);
    return;
  }
  if (!isValidUuid(uuidInput.value)) {
    error.value = "Invalid UUID format.";
    return;
  }
  emit("update-uuid", uuidInput.value);
  emit("update:modelValue", false);
}
</script>

<template>
  <base-modal 
    :model-value="modelValue" 
    title="Settings"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="uuid-settings">
      <ws-label label="Optimizer User ID" />
      <input
        v-model="uuidInput"
        type="text"
        class="uuid-input"
        spellcheck="false"
        autocomplete="off"
        maxlength="36"
      />
      <p class="text">
        This ID is only used by this tool. Change it to match between
        devices, to sync your optimizer data.
      </p>
      <ws-button @click="saveUuid" text="Save" />
      <div v-if="error" class="error-msg">{{ error }}</div>
    </div>
  </base-modal>
</template>

<style lang="scss" scoped>
.uuid-settings {
  display: flex;
  flex-direction: column;
  gap: $xxs;
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

.error-msg {
  color: $txNegative;
  margin-top: $xxs;
}
</style>
