<script setup>
import { ref, computed, watch } from "vue";
import { useGearSetStore } from "@/store/gearSet";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "new-set"]);

const gearSetStore = useGearSetStore();
const isOpen = ref(false);
const inputRef = ref(null);

const selectedSet = computed(() =>
  gearSetStore.gearSets.find((set) => set.id === props.modelValue)
);

const displayName = ref("");

watch(
  selectedSet,
  (newSet) => {
    if (newSet) {
      displayName.value = newSet.name;
    }
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      displayName.value = "";
    }
  },
  { immediate: true }
);

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function selectSet(setId) {
  emit("update:modelValue", setId);
  isOpen.value = false;
}

function selectNewSet() {
  displayName.value = "";
  emit("update:modelValue", null);
  emit("new-set");
  isOpen.value = false;

  setTimeout(() => {
    inputRef.value?.focus();
  }, 50);
}

function handleInputChange() {
  // If there's a selected set, update its name in the store
  if (selectedSet.value) {
    // This would require a method in the store to update set names
    // For now, we'll just emit the change
    // gearSetStore.updateSetName(selectedSet.value.id, displayName.value);
  }
}

function handleClickOutside() {
  isOpen.value = false;
}
</script>

<template>
  <div class="gear-set-dropdown" v-clickOutside="handleClickOutside">
    <div :class="['dropdown-header', { open: isOpen }]" @click="toggleDropdown">
      <input
        ref="inputRef"
        v-model="displayName"
        class="dropdown-input"
        :placeholder="selectedSet ? selectedSet.name : 'New Gear Set'"
        @input="handleInputChange"
        @click.stop
      />
      <div class="chevron" :class="{ open: isOpen }">▼</div>
    </div>

    <div v-if="isOpen" class="dropdown-list">
      <div class="dropdown-item new-set-item" @click="selectNewSet">
        <span class="new-set-text">+ New Gear Set</span>
      </div>

      <div
        v-for="set in gearSetStore.gearSets"
        :key="set.id"
        class="dropdown-item"
        :class="{ selected: set.id === modelValue }"
        @click="selectSet(set.id)"
      >
        <span class="set-name">{{ set.name }}</span>
        <span v-if="set.tags && set.tags.length" class="set-tags">
          {{ set.tags.join(", ") }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.gear-set-dropdown {
  position: relative;
  width: 100%;
}

.dropdown-header {
  display: flex;
  align-items: center;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  cursor: pointer;

  &:hover {
    background-color: $boxTransparentDarkBackground;
  }

  &.open {
    border-radius: $sm $sm 0 0;
  }
}

.dropdown-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: $sm;
  color: $txPrimary;
  font-size: $base;
  cursor: text;

  &::placeholder {
    color: $txDarker;
  }

  &:focus {
    cursor: text;
  }
}

.chevron {
  padding: $sm $xlg;
  color: $txDarker;
  transition: transform 0.2s ease;
  cursor: pointer;

  &.open {
    transform: rotate(180deg);
  }

  &:hover {
    color: $txPrimary;
  }
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-top: none;
  border-radius: 0 0 $sm $sm;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dropdown-item {
  padding: $sm;
  cursor: pointer;
  border-bottom: 1px solid $boxDarkOutline;
  display: flex;
  flex-direction: column;
  gap: $xxs;

  &:last-child {
    border-bottom: none;
  }

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }

  &.selected {
    background-color: $chipBackground;
  }
}

.new-set-item {
  border-bottom: 2px solid $boxDarkOutline;

  .new-set-text {
    color: $txPositive;
    font-weight: 500;
  }
}

.set-name {
  color: $txPrimary;
  font-weight: 500;
}

.set-tags {
  color: $txDarker;
  font-size: $sm;
}
</style>
