<script setup>
import { ref, computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";
import { icons } from "@/constants/iconPaths";
import WsIcon from "@/components/common/WsIcon.vue";
import WsButton from "@/components/common/WsButton.vue";
import TagSelection from "./TagSelection.vue";

const gearSetStore = useGearSetStore();
const isOpen = ref(false);
const inputRef = ref(null);
const confirmDeleteId = ref(null); // Track which set is in delete confirmation state
const searchText = ref(""); // Search filter text

const internalFilterTags = ref([]);

// Computed properties for filter status
const hasActiveFilters = computed(() => internalFilterTags.value.length > 0);
const filterCount = computed(() => internalFilterTags.value.length);

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

// Filter gear sets based on search text and selected filter tags
const filteredGearSets = computed(() => {
  let sets = gearSetStore.gearSets;

  // Apply text search filter
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase().trim();
    sets = sets.filter((set) => {
      const nameMatch = set.name.toLowerCase().includes(search);
      const tagsMatch =
        set.tags &&
        set.tags.some((tag) => tag.name.toLowerCase().includes(search));
      return nameMatch || tagsMatch;
    });
  }

  // Apply tag filter (show sets that have ALL selected filter tags)
  if (internalFilterTags.value.length > 0) {
    sets = sets.filter((set) => {
      if (!set.tags || set.tags.length === 0) return false;
      return internalFilterTags.value.every((filterTag) =>
        set.tags.some((setTag) => setTag.id === filterTag.id)
      );
    });
  }

  return sets;
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

async function selectSet(setId) {
  try {
    const success = await gearSetStore.selectAndEquipSet(setId);
    if (success) {
      isOpen.value = false;
    }
    searchText.value = "";
    // If failed, keep dropdown open so user can try again or select different set
  } catch (error) {
    console.error("Failed to select gear set:", error);
    // Keep dropdown open so user can try again or select different set
  }
}

async function selectNewSet() {
  await gearSetStore.createNewSetWithHistory();
  isOpen.value = false;
  // Focus the input after a brief delay to allow the UI to update
  setTimeout(() => {
    inputRef.value?.focus();
  }, 50);
  searchText.value = "";
}

function handleClickOutside() {
  isOpen.value = false;
  // Reset delete confirmation when clicking outside
  confirmDeleteId.value = null;
  // Clear search when closing dropdown
  searchText.value = "";
}

function clearSearch() {
  searchText.value = "";
}

function clearAllFilters() {
  searchText.value = "";
  internalFilterTags.value = [];
}

async function handleDeleteClick(setId) {
  if (confirmDeleteId.value === setId) {
    // Second click - actually delete
    try {
      await gearSetStore.deleteGearSet(setId);
      confirmDeleteId.value = null;
    } catch (error) {
      console.error("Failed to delete gear set:", error);
      // The error notification is handled in the store
    }
  } else {
    // First click - show confirmation
    confirmDeleteId.value = setId;
  }
}

function isConfirmingDelete(setId) {
  return confirmDeleteId.value === setId;
}
</script>

<template>
  <div class="gear-set-dropdown" v-click-outside="handleClickOutside">
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
      <tag-selection v-model="internalFilterTags" label="Tags:" />

      <!-- Search Input -->
      <div class="search-container">
        <input
          v-model="searchText"
          class="search-input"
          placeholder="Search..."
          @click.stop
        />
        <div class="search-actions">
          <button
            v-if="hasActiveFilters"
            class="clear-all-button"
            @click.stop="clearAllFilters"
            type="button"
            title="Clear all filters"
          >
            Clear All
          </button>
          <button
            v-if="searchText"
            class="clear-search-button"
            @click.stop="clearSearch"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      <button class="dropdown-item new-set-item" @click="selectNewSet">
        <span class="new-set-text">+ New Gear Set</span>
      </button>

      <button
        v-for="set in filteredGearSets"
        :key="set.id"
        class="dropdown-item"
        :class="{ selected: set.id === gearSetStore.currentSet.id }"
        @click="selectSet(set.id)"
      >
        <div class="set-info">
          <span class="set-name">{{ set.name }}</span>
          <div v-if="set.tags && set.tags.length" class="tag-icons">
            <ws-icon
              v-for="tag in set.tags"
              :key="tag.id"
              :icon-path="tag.icon"
              size="xs"
            />
          </div>
        </div>
        <ws-button
          v-if="!isConfirmingDelete(set.id)"
          :icon-path="icons.delete"
          @click.stop="handleDeleteClick(set.id)"
        />
        <ws-button
          v-else
          text="Delete?"
          class="delete-confirm-button"
          @click.stop="handleDeleteClick(set.id)"
        />
      </button>

      <div v-if="filteredGearSets.length === 0" class="no-results">
        <span v-if="searchText && hasActiveFilters">
          No gear sets found matching "{{ searchText }}" with
          {{ filterCount }} selected tag{{ filterCount > 1 ? "s" : "" }}
        </span>
        <span v-else-if="searchText">
          No gear sets found matching "{{ searchText }}"
        </span>
        <span v-else-if="hasActiveFilters">
          No gear sets found with {{ filterCount }} selected tag{{
            filterCount > 1 ? "s" : ""
          }}
        </span>
        <span v-else> No gear sets available </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gear-set-dropdown {
  position: relative;
  width: 100%;
  min-width: 0;
}

.dropdown-header {
  display: flex;
  align-items: center;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  cursor: pointer;
  min-width: 0;
  overflow: hidden;

  &:hover {
    background-color: $boxTransparentDarkBackground;
  }

  &.open {
    border-radius: $sm $sm 0 0;
  }
}

.dropdown-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  padding: $sm;
  color: $txPrimary;
  font-size: $base;
  cursor: text;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  &::placeholder {
    color: $txDarker;
  }

  &:focus {
    cursor: text;
  }
}

.chevron {
  box-sizing: border-box;
  flex-shrink: 0;
  min-width: 40px;
  padding: $sm $xlg;
  color: $txDarker;
  transition: transform 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

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
  padding-top: $xxxxs;
  border: 1px solid $boxDarkOutline;
  border-top: none;
  border-radius: 0 0 $sm $sm;
  max-height: 500px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.search-container {
  position: relative;
  border-bottom: 1px solid $boxDarkOutline;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  box-sizing: border-box;
  background-color: $boxTransparentDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $xs;
  padding: $xs $md;
  color: $txPrimary;
  font-size: $sm;
  outline: none;

  &::placeholder {
    color: $txDarker;
  }

  &:focus {
    border-color: $txPrimary;
    background-color: $boxDarkBackground;
  }
}

.search-actions {
  display: flex;
  align-items: center;
  gap: $xs;
  margin-left: $xs;
}

.clear-all-button {
  background-color: $txNegative;
  border: 1px solid $txNegative;
  color: white;
  cursor: pointer;
  font-size: $xs;
  padding: $xxs $xs;
  border-radius: $xs;
  font-weight: 500;

  &:hover {
    background-color: $txNegativeDark;
    border-color: $txNegativeDark;
  }
}

.clear-search-button {
  background: none;
  border: none;
  color: $txDarker;
  cursor: pointer;
  font-size: $sm;
  width: $lg;
  height: $lg;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $xs;

  &:hover {
    color: $txPrimary;
    background-color: $boxTransparentDarkOutline;
  }
}

.dropdown-item {
  width: 100%;
  background-color: $boxDarkBackground;

  padding: $sm;
  cursor: pointer;
  border-bottom: 1px solid $boxDarkOutline;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $sm;

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

.set-info {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  .tag-icons {
    display: flex;
    flex-wrap: wrap;
    gap: $xxxxs;
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

.delete-confirm-button {
  background-color: $txNegative !important;
  color: white !important;

  &:hover {
    background-color: $txNegativeDark !important;
  }
}

.no-results {
  padding: $md;
  text-align: center;
  color: $txDarker;
  font-size: $sm;
  font-style: italic;
}
</style>
