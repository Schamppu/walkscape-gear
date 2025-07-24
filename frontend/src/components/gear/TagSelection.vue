<script setup>
import { ref, computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: "Tags:",
  },
});

const emit = defineEmits(["update:modelValue"]);

const gearSetStore = useGearSetStore();
const isPopupOpen = ref(false);

// Local copy of selected tags for v-model
const selectedTags = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

function togglePopup() {
  isPopupOpen.value = !isPopupOpen.value;
}

function closePopup() {
  isPopupOpen.value = false;
}

function toggleTag(tagName) {
  const currentTags = [...selectedTags.value];
  const tagIndex = currentTags.indexOf(tagName);

  if (tagIndex === -1) {
    // Add tag
    currentTags.push(tagName);
  } else {
    // Remove tag
    currentTags.splice(tagIndex, 1);
  }

  selectedTags.value = currentTags;
}

function isTagSelected(tagName) {
  return selectedTags.value.includes(tagName);
}

function removeTag(tagName) {
  const currentTags = selectedTags.value.filter((tag) => tag !== tagName);
  selectedTags.value = currentTags;
}
</script>

<template>
  <div class="tag-selection">
    <div class="tag-header">
      <span class="tag-label">{{ label }}</span>
      <span
        v-for="tag in selectedTags"
        :key="tag"
        class="tag"
        @click="removeTag(tag)"
      >
        {{ tag.name }}
      </span>
      <button class="tag" @click="togglePopup" type="button">+</button>
    </div>

    <!-- Tag Selection Popup -->
    <div v-if="isPopupOpen" class="tag-popup-overlay" @click="closePopup">
      <div class="tag-popup" @click.stop>
        <div class="popup-header">
          <h3>Select Tags</h3>
          <button class="close-button" @click="closePopup" type="button">
            ✕
          </button>
        </div>

        <div class="tag-list">
          <button
            v-for="tag in gearSetStore.gearSetTags"
            :key="tag"
            class="tag"
            :class="{ selected: isTagSelected(tag) }"
            @click="toggleTag(tag)"
            type="button"
          >
            {{ tag.name }}
            <span v-if="isTagSelected(tag)" class="checkmark">✓</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tag-selection {
  position: relative;
}

.tag-header {
  display: flex;
  align-items: center;
  gap: $sm;
  margin-bottom: $xs;
}

.tag-label {
  color: $txPrimary;
  font-size: $sm;
  font-weight: 500;
}

.add-tag-button {
  width: $lg;
  height: $lg;
  border: 1px solid $boxDarkOutline;
  background-color: $boxDarkBackground;
  color: $txPrimary;
  border-radius: $xs;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $sm;
  font-weight: bold;

  &:hover {
    background-color: $boxTransparentDarkBackground;
    border-color: $txPrimary;
  }
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $xs;
}

.tag {
  cursor: pointer;
  text-transform: capitalize;
  
  display: inline-flex;
  align-items: center;
  gap: $xxs;
  background-color: $boxDarkBackground;
  color: $txPrimary;
  padding: $xxs $xs;
  border-radius: $xs;
  font-size: $xs;
  border: 1px solid $boxDarkOutline;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}

.tag-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.tag-popup {
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;
  padding: $md;
  min-width: 300px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $md;
  padding-bottom: $sm;
  border-bottom: 1px solid $boxDarkOutline;
}

.popup-header h3 {
  color: $txPrimary;
  font-size: $base;
  margin: 0;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: $txDarker;
  cursor: pointer;
  font-size: $base;
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

.tag-list {
  display: flex;
  flex-direction: column;
  gap: $xs;
}

.tag-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $sm;
  background-color: $boxTransparentDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $xs;
  color: $txPrimary;
  cursor: pointer;
  font-size: $sm;
  text-align: left;

  &:hover {
    background-color: $boxTransparentDarkOutline;
    border-color: $txPrimary;
  }

  &.selected {
    background-color: $chipBackground;
    border-color: $txPositive;
  }
}

.checkmark {
  color: $txPositive;
  font-weight: bold;
  font-size: $sm;
}
</style>
