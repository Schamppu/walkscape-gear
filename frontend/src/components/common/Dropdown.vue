<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  options: Array,
  selectedOption: {
    type: Object,
    default: { name: "None", value: -1 },
  },
  searchable: {
    type: Boolean,
    default: true,
  },
  width: {
    type: String,
    default: "20rem",
  },
  addNone: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["change"]);

const empty = { name: "None", value: -1 };
const searchQuery = ref("");

let initialValue;
if (props.addNone && !props.selectedOption) initialValue = empty;
else if (props.selectedOption) initialValue = props.selectedOption;
else initialValue = props.options[0];

const selection = ref(initialValue);

const shownOptions = computed(() => {
  const opts = props.addNone ? [empty].concat(props.options) : props.options;
  const filtered = opts.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
  return filtered;
});

const cssProps = computed(() => {
  return {
    "--dropdown-width": props.width,
  };
});

const handleChange = (option) => {
  selection.value = option;
  emit("change", option);
};

watch(
  () => props.selectedOption,
  (sel) => {
    handleChange(sel);
  }
);
</script>

<template>
  <el-dropdown
    trigger="click"
    placement="bottom-start"
    class="dropdown-main"
    :style="cssProps"
    @command="handleChange"
  >
    <span class="el-dropdown">
      <span class="dropdown">{{ selection.name }} </span>
    </span>

    <template #dropdown>
      <el-dropdown-menu class="dropdown-menu">
        <div v-if="searchable" class="dropdown-search">
          <el-input v-model="searchQuery" placeholder="Search..." clearable />
        </div>

        <el-dropdown-item
          v-for="item in shownOptions"
          :key="item.value"
          :command="item"
          :disabled="item.disabled"
        >
          {{ item.name }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>

.dropdown-main {
  cursor: pointer;

  width: var(--dropdown-width);

  background-color: $boxTransparentDarkOutline;
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;

  .el-dropdown {
    width: var(--dropdown-width);
    padding: $xs;
  }

  span {
    color: $txPrimary;
  }
}

.dropdown-menu {
  min-height: auto;
  max-height: 330px;
  overflow-y: auto;
}
</style>