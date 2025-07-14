<script setup>
import { ref, watch } from "vue";
import BaseModal from "@/components/common/BaseModal.vue";
import WsButton from "@/components/common/WsButton.vue";

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue", "import-data"]);

const importData = ref("");
const textareaRef = ref(null);

// Auto-paste from clipboard when modal opens
async function tryAutoPaste() {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText.trim()) {
        importData.value = clipboardText;
      }
    }
  } catch {
    // Clipboard access denied or not supported, silently continue
    console.log("Clipboard access not available");
  }
}

// Watch for modal opening to trigger auto-paste and focus
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      setTimeout(async () => {
        await tryAutoPaste();
        textareaRef.value?.focus();
      }, 100);
    }
  }
);

function handleSave() {
  const data = importData.value.trim();
  if (!data) {
    return; // Don't save empty data
  }

  emit("import-data", data);
  emit("update:modelValue", false);
  importData.value = ""; // Clear the field
}

function handleCancel() {
  emit("update:modelValue", false);
  importData.value = ""; // Clear the field
}

// Manual paste button for browsers without clipboard access
async function handlePasteClick() {
  try {
    const clipboardText = await navigator.clipboard.readText();
    importData.value = clipboardText;
  } catch {
    // Fallback: focus the textarea so user can manually paste
    textareaRef.value?.focus();
  }
}
</script>

<template>
  <base-modal
    :model-value="modelValue"
    title="Import Data"
    width="80%"
    max-width="600px"
    min-height="400px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Main content goes in the default slot -->
    <div class="content">
      <p class="instructions">Paste your data into the text field below.</p>
      <p class="instructions">
        Find your data in the game under settings -> character -> export
        character data to clipboard.
      </p>

      <div class="form-group">
        <div class="textarea-header">
          <label for="import-data">Data to Import:</label>
          <ws-button
            text="Paste from Clipboard"
            size="sm"
            @click="handlePasteClick"
          />
        </div>
        <textarea
          id="import-data"
          ref="textareaRef"
          v-model="importData"
          class="import-textarea"
          placeholder="Paste your data here..."
          rows="12"
        />
        <div class="character-count">{{ importData.length }} characters</div>
      </div>
    </div>

    <!-- Footer with action buttons -->
    <template #footer>
      <div class="button-group">
        <ws-button text="Cancel" @click="handleCancel" />
        <ws-button
          text="Import"
          :disabled="!importData.trim()"
          @click="handleSave"
        />
      </div>
    </template>
  </base-modal>
</template>

<style lang="scss" scoped>
.content {
  display: flex;
  flex-direction: column;
  gap: $base;
}

.instructions {
  font-size: $sm;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $xxs;
}

.textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  label {
    font-weight: 500;
  }
}

.import-textarea {
  width: 100%;
  padding: $xs;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background: $bgPrimary;
  color: $txPrimary;
  font-family: monospace;
  font-size: $sm;
  resize: vertical;
  min-height: 200px;

  &:focus {
    outline: 2px solid $chipOutline;
    border-color: $chipOutline;
  }
}

.character-count {
  font-size: $xs;
  text-align: right;
}

.button-group {
  display: flex;
  gap: $xxs;
  justify-content: flex-end;
}
</style>
