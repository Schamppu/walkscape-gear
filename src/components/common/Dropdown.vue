<script setup>
import { ref, computed } from "vue";

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
});

const emit = defineEmits(["change"]);

const empty = { name: "None", value: -1 };
const searchQuery = ref("");
const selection = ref(props.selectedOption ? props.selectedOption : empty);

const shownOptions = computed(() => {
  const opts = [empty].concat(props.options);
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
@import "@/styles/utils/variables.scss";

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