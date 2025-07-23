<script setup>
import { ref, computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";

const gearSetStore = useGearSetStore();
const gearStore = useGearStore();
const isOpen = ref(false);
const inputRef = ref(null);

// Use the store's current set instead of local state
const selectedSet = computed(() =>
  gearSetStore.currentSet.id
    ? gearSetStore.gearSets.find((set) => set.id === gearSetStore.currentSet.id)
    : null
);

const displayName = computed({
  get: () => gearSetStore.currentSet.name,
  set: (value) => gearSetStore.updateCurrentSetName(value),
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function selectSet(setId) {
  gearSetStore.loadSet(setId);

  const gearSet = Object.fromEntries(
    gearSetStore.getCurrentSet.items.map(
      ({ itemId, quality, slotIndex, slotType }) => {
        const slotName = ["ring", "tool"].includes(slotType)
          ? `${slotType}${slotIndex + 1}`
          : slotType;
        return [
          slotName,
          {
            id: itemId,
            quality: quality || null,
          },
        ];
      }
    )
  );

  gearStore.equipMultiple(gearSet);
  isOpen.value = false;
}

function selectNewSet() {
  gearSetStore.createNewSet();
  isOpen.value = false;
  // Focus the input after a brief delay to allow the UI to update
  setTimeout(() => {
    inputRef.value?.focus();
  }, 50);
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
        :class="{ selected: set.id === gearSetStore.currentSet.id }"
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
