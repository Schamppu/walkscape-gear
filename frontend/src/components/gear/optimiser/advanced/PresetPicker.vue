<script setup lang="ts">
import { computed, ref, watch } from "vue";
import WsButton from "@/components/primitives/WsButton.vue";
import PresetSavePanel from "./PresetSavePanel.vue";
import { useOptimiserPresetsStore } from "@/store/optimiserPresets";
import { presetTargetsProblem, type OptimiserPreset } from "@/domain/advancedOptimiser/presets";
import type { Target } from "@/domain/advancedOptimiser/config";

/**
 * Preset dropdown at the top of the optimiser: pick a preset to load its
 * targets, reorder the player's own presets, hide built-ins, and open the
 * panel to save or edit a preset.
 */
const props = defineProps<{
  /** Presets that apply to this activity, in display order. */
  presets: OptimiserPreset[];
  /** Hidden built-ins that would apply here. */
  hiddenPresets: OptimiserPreset[];
  selected: OptimiserPreset | null;
  modified: boolean;
  targets: Target[];
  /** Saves over the selected user preset; resolves to whether it saved. */
  save: (name: string) => Promise<boolean>;
  /** Saves as a new preset and selects it; resolves to whether it saved. */
  saveAsNew: (name: string) => Promise<boolean>;
}>();

const emit = defineEmits<{
  (event: "apply", presetId: string): void;
}>();

const presetsStore = useOptimiserPresetsStore();

const isOpen = ref(false);
/** The hidden built-ins stay folded away until asked for. */
const showHidden = ref(false);
const panel = ref<"save" | "edit" | null>(null);
const busy = ref(false);

const selectedUserPreset = computed(() =>
  props.selected && !props.selected.builtin ? props.selected : null,
);

// The edit panel belongs to the preset it was opened for.
watch(selectedUserPreset, (preset) => {
  if (!preset && panel.value === "edit") panel.value = null;
});

const label = computed(() => props.selected?.name ?? "Custom targets");

/** The player's presets shown here; ▲ / ▼ swap with the neighbour in this list. */
const userPresets = computed(() => props.presets.filter((p) => !p.builtin));

const neighbour = (preset: OptimiserPreset, offset: -1 | 1): OptimiserPreset | null =>
  userPresets.value[userPresets.value.indexOf(preset) + offset] ?? null;

const close = (): void => {
  isOpen.value = false;
  showHidden.value = false;
};

const choose = (presetId: string): void => {
  emit("apply", presetId);
  close();
};

const move = (preset: OptimiserPreset, offset: -1 | 1): void => {
  const other = neighbour(preset, offset);
  if (other) void presetsStore.swapPresets(preset.id, other.id);
};

const openPanel = (mode: "save" | "edit"): void => {
  panel.value = panel.value === mode ? null : mode;
  close();
};

/** Runs a panel action, closing the panel when it succeeds. */
const runAction = async (action: () => Promise<boolean>): Promise<void> => {
  busy.value = true;
  try {
    if (await action()) panel.value = null;
  } finally {
    busy.value = false;
  }
};

const onRename = (name: string): Promise<void> =>
  runAction(async () =>
    !!selectedUserPreset.value &&
    !!(await presetsStore.renamePreset(selectedUserPreset.value.id, name)),
  );

const onDelete = (): Promise<void> =>
  runAction(async () =>
    !!selectedUserPreset.value && presetsStore.deletePreset(selectedUserPreset.value.id),
  );
</script>

<template>
  <section class="preset-picker">
    <div class="row">
      <div v-click-outside="close" class="dropdown" @keydown.esc="close">
        <button
          type="button"
          class="trigger"
          :aria-expanded="isOpen"
          @click="isOpen = !isOpen"
        >
          <span class="label">
            {{ label }}<span v-if="modified" class="modified"> (modified)</span>
          </span>
          <span class="chevron" :class="{ open: isOpen }" aria-hidden="true">▼</span>
        </button>

        <ul v-if="isOpen" class="menu" aria-label="Presets">
          <li
            v-for="preset in presets"
            :key="preset.id"
            class="item"
            :class="{ selected: preset.id === selected?.id }"
          >
            <button
              type="button"
              class="choose"
              :aria-current="preset.id === selected?.id || undefined"
              @click="choose(preset.id)"
            >
              <span class="name">{{ preset.name }}</span>
              <span v-if="preset.description" class="item-description">
                {{ preset.description }}
              </span>
            </button>
            <span v-if="!preset.builtin" class="item-actions">
              <ws-button
                text="▲"
                variant="secondary"
                :aria-label="`Move ${preset.name} up`"
                :disabled="!neighbour(preset, -1)"
                @click.stop="move(preset, -1)"
              />
              <ws-button
                text="▼"
                variant="secondary"
                :aria-label="`Move ${preset.name} down`"
                :disabled="!neighbour(preset, 1)"
                @click.stop="move(preset, 1)"
              />
            </span>
            <span v-else class="item-actions">
              <ws-button
                text="Hide"
                variant="secondary"
                :aria-label="`Hide ${preset.name}`"
                @click.stop="presetsStore.setBuiltinHidden(preset.id, true)"
              />
            </span>
          </li>
          <li v-if="!presets.length" class="empty">No presets for this activity</li>

          <template v-if="hiddenPresets.length">
            <li class="group-heading">
              <button
                type="button"
                class="group-toggle"
                :aria-expanded="showHidden"
                @click.stop="showHidden = !showHidden"
              >
                <span>Hidden ({{ hiddenPresets.length }})</span>
                <span class="chevron" :class="{ open: showHidden }" aria-hidden="true">▼</span>
              </button>
            </li>
            <template v-if="showHidden">
              <li v-for="preset in hiddenPresets" :key="preset.id" class="item hidden">
                <span class="choose">
                  <span class="name">{{ preset.name }}</span>
                </span>
                <span class="item-actions">
                  <ws-button
                    text="Show"
                    variant="secondary"
                    :aria-label="`Show ${preset.name}`"
                    @click.stop="presetsStore.setBuiltinHidden(preset.id, false)"
                  />
                </span>
              </li>
            </template>
          </template>
        </ul>
      </div>

      <ws-button
        text="Save…"
        :aria-expanded="panel === 'save'"
        @click="openPanel('save')"
      />
      <ws-button
        v-if="selectedUserPreset"
        text="Edit"
        :aria-label="`Rename or delete ${selectedUserPreset.name}`"
        :aria-expanded="panel === 'edit'"
        @click="openPanel('edit')"
      />
    </div>

    <p v-if="selected?.description" class="description">{{ selected.description }}</p>

    <preset-save-panel
      v-if="panel"
      :mode="panel"
      :initial-name="selectedUserPreset?.name ?? ''"
      :can-overwrite="!!selectedUserPreset"
      :targets-problem="presetTargetsProblem(targets)"
      :busy="busy"
      @save="(name) => runAction(() => save(name))"
      @save-as-new="(name) => runAction(() => saveAsNew(name))"
      @rename="onRename"
      @delete="onDelete"
      @cancel="panel = null"
    />
  </section>
</template>

<style lang="scss" scoped>
.preset-picker {
  display: flex;
  flex-direction: column;
  gap: $xs;
}

.row {
  display: flex;
  align-items: stretch;
  gap: $xs;

  > :deep(.button) {
    padding: $xxs $xs;
  }
}

.dropdown {
  position: relative;
  flex: 1;
  min-width: 0;
}

.trigger {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $xs;
  padding: $xs $sm;
  cursor: pointer;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;

  &:hover,
  &:focus-visible {
    background-color: $boxTransparentDarkBackground;
  }

  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modified {
    color: $txDarker;
  }
}

.chevron {
  flex-shrink: 0;
  color: $txDarker;
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(180deg);
  }
}

.menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 60vh;
  overflow-y: auto;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: 0 0 $sm $sm;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.item {
  display: flex;
  align-items: center;
  gap: $xs;
  padding-right: $xs;
  border-bottom: 1px solid $boxDarkOutline;

  &:last-child {
    border-bottom: none;
  }

  &.selected {
    background-color: $chipBackground;
  }

  &.hidden .name {
    opacity: 0.6;
  }
}

.choose {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $xxxxs;
  padding: $xs $sm;
  text-align: left;
  background: none;
  border: none;
}

button.choose {
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background-color: $boxTransparentDarkOutline;
  }
}

.name {
  color: $txPrimary;
  font-weight: 500;
}

.item-description {
  color: $txDarker;
  font-size: 0.875em;
}

.item-actions {
  display: flex;
  gap: $xxxxs;
  flex-shrink: 0;
}

.group-heading,
.empty {
  color: $txDarker;
  font-size: 0.875em;
  border-bottom: 1px solid $boxDarkOutline;

  &:last-child {
    border-bottom: none;
  }
}

.empty {
  padding: $xs $sm;
  font-style: italic;
}

.group-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $xs $sm;
  color: inherit;
  font: inherit;
  cursor: pointer;
  background: none;
  border: none;

  &:hover,
  &:focus-visible {
    background-color: $boxTransparentDarkOutline;
  }
}

.description {
  margin: 0;
  color: $txDarker;
  font-size: 0.875em;
}
</style>
