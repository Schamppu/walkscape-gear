<script setup>
import { ref } from "vue";
import Tab from "./Tab.vue";

const props = defineProps({
  tabs: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["selectTab"]);

const activeTab = ref(0);
const tabNames = Object.keys(props.tabs);

const changeTab = (index) => {
  activeTab.value = index;
  emit("selectTab", tabNames[index]);
};
</script>

<template>
  <div class="footer">
    <tab
      v-for="(name, index) in tabNames"
      :key="name"
      :active="activeTab === index"
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
  height: 64px;

  z-index: 500;
}
</style>
