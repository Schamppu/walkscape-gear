<script setup>
import { ref, computed, onMounted } from "vue";
import WsLabel from "../WsLabel.vue";
import LabelWithIcon from "../LabelWithIcon.vue";
import DropdownCategory from "./DropdownCategory.vue";

const props = defineProps({
  label: String,
  data: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["select"]);

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

const dropdownRef = ref("dropdownRef");
const isOpen = ref(false);
const selected = ref("");
const searchTerm = ref("");

onMounted(() => {
  const noneOption = props.data.filter(({ value }) => value === "None");
  if (noneOption.length) selectItem(noneOption[0]);
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
        item.value.toLowerCase().includes(term)
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

const selectItem = (item) => {
  isOpen.value = false;
  selected.value = item;
  emit("select", item);
};
</script>
  
<template>
  <div v-clickOutside="handleClickOutside" class="wrapper" ref="dropdownRef">
    <div class="header">
      <ws-label :label="label" label-for="dropdown-trigger" />
      <div class="dropdown-trigger" @click="toggle">
        <label-with-icon
          :text="selected.value || 'Select an item'"
          :icon="selected.icon"
        ></label-with-icon>
        <span class="chevron" :class="{ isOpen }">▼</span>
      </div>
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
          :key="index"
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
  background-color: $boxTransparentPrimaryBackground;

  padding: $sm;
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;
}

.dropdown-menu {
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;
  background-color: $boxTransparentPrimaryBackground;
  overflow: hidden;

  .dropdown-search {
    width: 100%;
    padding: $sm;
    border-bottom: 1px solid $boxPrimaryOutline;

    &:focus {
      outline: 1px solid $chipOutline;
    }
  }

  .category-list {
    .category-li {
      border-bottom: 1px solid $boxPrimaryOutline;
    }

    &:last-child {
      border-bottom: unset;
    }
  }
}
</style>