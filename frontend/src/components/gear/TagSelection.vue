<script setup>
import { ref, computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";
import WsIcon from "@/components/common/WsIcon.vue";
import WsButton from "@/components/common/WsButton.vue";

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

// Group tags by category
const groupedTags = computed(() => {
  const groups = {};
  gearSetStore.gearSetTags.forEach((tag) => {
    if (!groups[tag.category]) {
      groups[tag.category] = [];
    }
    groups[tag.category].push(tag);
  });
  return groups;
});

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

function toggleTag(tagId) {
  const currentTags = [...selectedTags.value];
  const existingTagIndex = currentTags.findIndex((tag) => tag.id === tagId);

  if (existingTagIndex === -1) {
    // Add tag - find the full tag object
    const fullTag = gearSetStore.gearSetTags.find((t) => t.id === tagId);
    if (fullTag) {
      currentTags.push(fullTag);
    }
  } else {
    // Remove tag
    currentTags.splice(existingTagIndex, 1);
  }

  selectedTags.value = currentTags;
}

function isTagSelected(tagId) {
  return selectedTags.value.some((tag) => tag.id === tagId);
}

function removeTag(tagToRemove) {
  const tagId = tagToRemove.id;
  const currentTags = selectedTags.value.filter((tag) => tag.id !== tagId);
  selectedTags.value = currentTags;
}
</script>

<template>
  <div class="tag-selection">
    <div class="tag-header">
      <span class="tag-label">{{ label }}</span>
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        :class="['tag', `border-${tag.id}`]"
        @click="removeTag(tag)"
      >
        <ws-icon v-if="tag.icon" :icon-path="tag.icon" size="sm" />
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

        <div class="tag-categories">
          <div
            v-for="(tags, category) in groupedTags"
            :key="category"
            class="tag-category"
          >
            <h4 class="category-label">{{ category }}</h4>
            <div class="category-tags">
              <button
                v-for="tag in tags"
                :key="tag.id"
                :class="[
                  'tag',
                  `border-${tag.id}`,
                  { selected: isTagSelected(tag.id) },
                ]"
                @click="toggleTag(tag.id)"
                type="button"
              >
                <ws-icon :icon-path="tag.icon" size="sm" />
                {{ tag.name }}
                <span v-if="isTagSelected(tag.id)" class="checkmark">✓</span>
              </button>
            </div>
          </div>
        </div>

        <div class="tag-footer">
          <ws-button text="Close" @click="closePopup" />
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
  flex-wrap: wrap;
  align-items: center;
  padding: 0 $xs;
  gap: $xxxs $xs;
  margin-bottom: $xs;
}

.tag-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: $xs;
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
  border: 1px solid $boxDarkOutline;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }

  // Special styling for tags in the category popup
  .category-tags & {
    padding: $xxs;
    background-color: $boxTransparentDarkBackground;
    font-size: $sm;
    text-align: left;
    width: 100%;

    &:hover {
      background-color: $boxTransparentDarkOutline;
      border-color: $txPrimary;
    }

    &.selected {
      background-color: $chipBackground;
      border-color: $txPositive;
    }
  }
}

.tag-categories {
  display: flex;
  flex-wrap: wrap;
  gap: $md;
}

.category-label {
  font-size: $sm;
  margin: 0 0 $xs 0;
  padding-left: $xs;
  padding-bottom: $xxxs;
  border-bottom: 1px solid $boxDarkOutline;
  text-transform: capitalize;
  text-align: left;
}

.category-tags {
  display: flex;
  flex-direction: column;
  gap: $xxxs;
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

.checkmark {
  color: $txPositive;
  font-weight: bold;
  font-size: $sm;
}
</style>
