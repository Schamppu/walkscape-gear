

<script setup>
import { ref, watch } from "vue";
import LabelWithIcon from "../LabelWithIcon.vue";
import DropdownItem from "./DropdownItem.vue";

const props = defineProps({
  category: {
    type: Object,
    required: true,
  },
  forceOpen: { type: Boolean, default: false },
  noBorder: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select"]);

const isOpen = ref(false);
const isNone = props.category.value === "None";

function toggle() {
  isOpen.value = !isOpen.value;
}

function handleSelect(item) {
  emit("select", item);
}

watch(
  () => props.forceOpen,
  (val) => {
    if (val) isOpen.value = true;
  },
  { immediate: true }
);
</script>

<template>
  <li class="dropdown-category">
    <button
      class="category-header"
      :class="{ 'no-border': noBorder }"
      @click="isNone ? handleSelect(category) : toggle()"
    >
      <LabelWithIcon :icon="category.icon" :text="category.value" />
      <span v-if="!isNone" class="chevron" :class="{ open: isOpen }">▼</span>
    </button>

    <ul v-if="isOpen" class="item-list">
      <DropdownItem
        v-for="(item, idx) in category.items"
        :key="idx"
        :item="item"
        class="item"
        @select="handleSelect"
      />
    </ul>
  </li>
</template>

<style lang="scss" scoped>
.chevron {
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(180deg);
  }
}

.dropdown-category {
  .category-header {
    width: 100%;
    display: flex;
    padding: $xxs $xs;
    background-color: $boxTransparentDarkBackground;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid $boxPrimaryOutline;

    &.no-border {
      border-top: unset;
    }
  }

  .item-list {
    background-color: $boxTransparentDarkBackground;
    list-style: none;
    padding: 0;
    margin: 0;

    .item {
      border-top: 1px solid $boxPrimaryOutline;
      padding-left: $xxlg;
    }
  }
}
</style>
