<script setup>
import { ref, computed, onMounted, watch } from "vue";
import WsLabel from "@/components/primitives/WsLabel.vue";
import LabelWithIcon from "../LabelWithIcon.vue";
import DropdownCategory from "./DropdownCategory.vue";

const props = defineProps({
  label: String,
  data: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: [String, Object],
    default: null,
  },
  defaultText: {
    type: String,
    default: "Select an item",
  },
});

const emit = defineEmits(["select"]);

const handleClickOutside = () => {
  isOpen.value = false;
};

const isOpen = ref(false);
const selected = ref(props.modelValue || "");
const searchTerm = ref("");

onMounted(() => {
  const noneOption = props.data.filter(({ value }) => value === "None");
  if (!selected.value && noneOption.length) selectItem(noneOption[0], false);
});

const toggle = () => {
  searchTerm.value = "";
  isOpen.value = !isOpen.value;
};

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return props.data;

  const term = searchTerm.value.toLowerCase();

  return props.data
    .map((category) => {
      const matchesCategory = category.value.toLowerCase().includes(term);

      const matchingItems = category.items.filter((item) =>
        item.value.toLowerCase().includes(term),
      );

      if (matchesCategory || matchingItems.length > 0) {
        return {
          ...category,
          items: matchesCategory ? category.items : matchingItems,
        };
      }

      return null;
    })
    .filter(Boolean);
});

const labelText = computed(() => {
  return selected.value?.id !== "none"
    ? selected.value.value || selected.value.name
    : props.defaultText;
});

watch(
  () => props.modelValue,
  (val) => {
    selected.value = val;
  },
);

const selectItem = (item, update = true) => {
  isOpen.value = false;
  selected.value = item;
  emit("select", item, update);
};
</script>

<template>
  <div v-click-outside="handleClickOutside" class="wrapper">
    <div class="header">
      <ws-label :label="label" label-for="dropdown-trigger" />
      <button class="dropdown-trigger" @click="toggle">
        <label-with-icon :text="labelText" :icon="selected.icon" />
        <span class="chevron" :class="{ isOpen }">▼</span>
      </button>
    </div>

    <div v-if="isOpen" class="dropdown-menu">
      <input
        v-focus
        ref="searchInput"
        v-model="searchTerm"
        type="text"
        placeholder="Search..."
        class="dropdown-search"
      />

      <ul class="category-list">
        <DropdownCategory
          v-for="(category, index) in filteredData"
          :key="category.name"
          :category="category"
          :force-open="searchTerm !== ''"
          :no-border="index === 0"
          @select="selectItem"
        />
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
ul {
  list-style-type: none;
}

.wrapper {
  display: flex;
  flex-direction: column;
  text-align: left;
  position: relative;

  .header {
    display: flex;
    flex-direction: column;
    gap: $xxs;
  }
}

.chevron {
  justify-self: flex-end;
  transition: transform 0.2s ease;
  display: inline-block;
  transform: rotate(0deg);

  &.isOpen {
    transform: rotate(180deg);
  }
}

.dropdown-trigger {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: $boxPrimaryBackground;

  padding: $sm;
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;
  background-color: $boxPrimaryBackground;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 60vh;

  .dropdown-search {
    width: 100%;
    padding: $sm;
    border-bottom: 1px solid $boxPrimaryOutline;
    flex-shrink: 0;

    &:focus {
      outline: 1px solid $chipOutline;
    }
  }

  .category-list {
    overflow-y: auto;

    .category-li {
      border-bottom: 1px solid $boxPrimaryOutline;
    }

    &:last-child {
      border-bottom: unset;
    }
  }
}
</style>
