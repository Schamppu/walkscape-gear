<script setup lang="ts">
import { computed } from "vue";
import Tab from "./FooterTab.vue";

interface FooterTabItem {
  name: string;
  icon?: string;
}

const props = defineProps<{
  tabs: FooterTabItem[];
  activeTab: string;
}>();

const emit = defineEmits<{
  (event: "selectTab", name: string): void;
}>();

const tabNames = computed(() => props.tabs.map(({ name }) => name));
const activeTabIndex = computed(() => tabNames.value.indexOf(props.activeTab));

const changeTab = (index: number): void => {
  emit("selectTab", tabNames.value[index]);
};
</script>

<template>
  <nav class="footer" aria-label="Main navigation">
    <tab
      v-for="({ name, icon }, index) in props.tabs"
      :key="name"
      :active="activeTabIndex === index"
      :name="name"
      :icon="icon"
      @click="changeTab(index)"
    />
  </nav>
</template>

<style lang="scss" scoped>
.footer {
  width: 100%;
  display: flex;
  justify-content: space-around;
  border-top: 1px solid $boxDarkOutline;
  padding: 0;

  flex-shrink: 0;
  position: fixed;
  left: 0;
  bottom: 0;
  background-color: $boxDarkBackground;
  height: $footerHeight;

  z-index: 500;
}
</style>
