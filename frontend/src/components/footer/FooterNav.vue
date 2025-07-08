<script setup>
import { computed } from "vue";
import Tab from "./FooterTab.vue";

const props = defineProps({
  tabs: {
    type: Object,
    required: true,
  },
  activeTab: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["selectTab"]);

const tabNames = Object.keys(props.tabs);
const activeTabIndex = computed(() => tabNames.indexOf(props.activeTab));

const changeTab = (index) => {
  emit("selectTab", tabNames[index]);
};
</script>

<template>
  <div class="footer">
    <tab
      v-for="(name, index) in tabNames"
      :key="name"
      :active="activeTabIndex === index"
      :name="name"
      @click="changeTab(index)"
    ></tab>
  </div>
</template>

<style lang="scss" scoped>
.footer {
  width: 100%;
  display: flex;
  justify-content: space-around;
  border-top: 1px solid $chipOutline;
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
