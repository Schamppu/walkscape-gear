<script setup lang="ts">
import { computed, ref, watch } from "vue";
import WsButton from "@/components/primitives/WsButton.vue";
import {
  MAX_PRESET_NAME_LENGTH,
  presetNameProblem,
} from "@/domain/advancedOptimiser/presets";

/**
 * Inline panel under the preset picker.
 * - `save`: name the current targets, then Save (over the selected user
 *   preset, when there is one) or Save as new.
 * - `edit`: Rename or Delete the selected user preset.
 */
const props = defineProps<{
  mode: "save" | "edit";
  initialName: string;
  /** A user preset is selected, so Save can overwrite it. */
  canOverwrite: boolean;
  /** Why the current targets can't be saved, if they can't. */
  targetsProblem: string | null;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: "save", name: string): void;
  (event: "save-as-new", name: string): void;
  (event: "rename", name: string): void;
  (event: "delete"): void;
  (event: "cancel"): void;
}>();

const name = ref(props.initialName);
const confirmingDelete = ref(false);

watch(
  () => [props.mode, props.initialName],
  () => {
    name.value = props.initialName;
    confirmingDelete.value = false;
  },
);

const nameProblem = computed(() => presetNameProblem(name.value));
const problem = computed(() =>
  props.mode === "save"
    ? (props.targetsProblem ?? nameProblem.value)
    : nameProblem.value,
);
const trimmedName = computed(() => name.value.normalize("NFC").trim());

const onDelete = (): void => {
  if (confirmingDelete.value) {
    emit("delete");
  } else {
    confirmingDelete.value = true;
  }
};
</script>

<template>
  <form class="preset-save-panel" @submit.prevent>
    <label class="name">
      <span>Preset name</span>
      <input
        v-model="name"
        v-focus
        type="text"
        :maxlength="MAX_PRESET_NAME_LENGTH"
        :disabled="busy"
        @keydown.esc="emit('cancel')"
      />
    </label>
    <!-- An empty name only disables the buttons; the field says what's wanted. -->
    <p v-if="mode === 'save' && targetsProblem" class="problem" role="status">
      {{ targetsProblem }}
    </p>
    <p v-else-if="name && nameProblem" class="problem" role="status">
      {{ nameProblem }}
    </p>

    <div class="actions">
      <template v-if="mode === 'save'">
        <ws-button
          v-if="canOverwrite"
          text="Save"
          type="submit"
          :disabled="busy || !!problem"
          @click="emit('save', trimmedName)"
        />
        <ws-button
          text="Save as new"
          :type="canOverwrite ? 'button' : 'submit'"
          :disabled="busy || !!problem"
          @click="emit('save-as-new', trimmedName)"
        />
      </template>
      <template v-else>
        <ws-button
          text="Rename"
          type="submit"
          :disabled="busy || !!problem || trimmedName === initialName"
          @click="emit('rename', trimmedName)"
        />
        <ws-button
          :text="confirmingDelete ? 'Delete?' : 'Delete'"
          class="delete"
          :class="{ confirming: confirmingDelete }"
          :disabled="busy"
          @click="onDelete"
        />
      </template>
      <ws-button
        text="Cancel"
        variant="secondary"
        :disabled="busy"
        @click="emit('cancel')"
      />
    </div>
  </form>
</template>

<style lang="scss" scoped>
.preset-save-panel {
  display: flex;
  flex-direction: column;
  gap: $xs;
  padding: $sm;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  background-color: $boxTransparentDarkBackground;
}

.name {
  display: flex;
  flex-direction: column;
  gap: $xxs;

  input {
    background: $bgPrimary;
    color: $txPrimary;
    border: 1px solid $boxDarkOutline;
    border-radius: $xs;
    padding: $xxs $xs;
  }
}

.problem {
  margin: 0;
  color: $txNegative;
  font-size: 0.875em;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: $xs;

  :deep(.button) {
    padding: $xxs $xs;
  }
}

.delete {
  color: $txNegative;

  &.confirming {
    background-color: $txNegative;
    color: white;
  }
}
</style>
