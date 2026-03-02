<script setup>
import { ref, watch } from "vue";
import { usePlayerStore } from "@/store/player";
import { deleteUserData } from "@/utils/axios/db_routes";
import WsLabel from "../primitives/WsLabel.vue";
import WsButton from "../primitives/WsButton.vue";

const emit = defineEmits(["update-uuid"]);

const playerStore = usePlayerStore();

const uuidInput = ref(playerStore.userUuid || "");
const error = ref("");

const showDeleteConfirm = ref(false);
const isDeleting = ref(false);
const deleteError = ref("");

// Reset form when component is mounted or player store changes
watch(
  () => playerStore.userUuid,
  (newUuid) => {
    uuidInput.value = newUuid || "";
    error.value = "";
  },
  { immediate: true },
);

function isValidUuid(uuid) {
  // Standard UUID v4 regex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid,
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

function cancelDelete() {
  showDeleteConfirm.value = false;
  deleteError.value = "";
}

async function confirmDelete() {
  isDeleting.value = true;
  deleteError.value = "";
  try {
    await deleteUserData();
    // Generate a fresh UUID so the app starts clean
    const newUuid = crypto.randomUUID();
    emit("update-uuid", newUuid);
  } catch {
    deleteError.value = "Failed to delete data. Please try again.";
    isDeleting.value = false;
  }
}
</script>

<template>
  <div class="user-settings">
    <ws-label label="Gear Tool User ID" />
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
      sync your gear tool data.
    </p>
    <div class="actions">
      <ws-button @click="saveUuid" text="Save" />
      <ws-button @click="resetForm" text="Reset" variant="secondary" />
    </div>
    <div v-if="error" class="error-msg">{{ error }}</div>

    <hr class="divider" />

    <div class="delete-section">
      <button
        v-if="!showDeleteConfirm"
        class="btn btn-danger"
        @click="showDeleteConfirm = true"
      >
        Delete all my data
      </button>

      <div v-else class="delete-confirm">
        <p class="delete-warning">
          <strong>This will permanently delete:</strong>
        </p>
        <ul class="delete-list">
          <li>Your player stats and skill levels</li>
          <li>All owned item records</li>
          <li>Faction reputation data</li>
          <li>All saved gear sets</li>
          <li>Your settings</li>
        </ul>
        <p class="delete-irreversible">
          ⚠ This cannot be undone. A new ID will be generated automatically.
        </p>
        <div class="delete-actions">
          <button
            class="btn btn-danger"
            @click="confirmDelete"
            :disabled="isDeleting"
          >
            Delete all data
          </button>
          <button
            class="btn btn-secondary"
            @click="cancelDelete"
            :disabled="isDeleting"
          >
            Cancel
          </button>
        </div>
        <div v-if="deleteError" class="error-msg">{{ deleteError }}</div>
      </div>
    </div>
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

.divider {
  border: none;
  border-top: 1px solid $boxDarkOutline;
  margin: $xs 0;
}

.delete-section {
  display: flex;
  flex-direction: column;
  gap: $sm;
}

.delete-confirm {
  display: flex;
  flex-direction: column;
  gap: $sm;
  padding: $sm;
  border: 1px solid $txNegative;
  border-radius: $sm;
  background: rgba(255, 0, 0, 0.04);
}

.delete-warning {
  font-size: 0.9em;
  margin: 0;
}

.delete-list {
  list-style-type: disc;
  padding-left: $md;
  font-size: 0.9em;
  margin: 0;

  li {
    text-align: left;
  }
}

.delete-irreversible {
  font-size: 0.85em;
  color: $txNegative;
  margin: 0;
}

.delete-actions {
  display: flex;
  gap: $sm;
}

.btn {
  cursor: pointer;
  display: flex;
  align-items: center;
  align-self: center;
  padding: $xxxs;
  border-radius: $md;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-danger {
  background-color: $txNegative;
  border: 1px solid $txNegative;
  color: #fff;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    filter: brightness(1.15);
  }
}

.btn-secondary {
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
