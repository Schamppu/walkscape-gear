<script setup>
import Tab from "./Tab.vue";

const props = defineProps({
  tabs: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["selectTab"]);

const tabNames = Object.keys(props.tabs);

const changeTab = (tabName) => {
  emit("selectTab", tabName);
};
</script>

<template>
  <div class="footer">
    <tab
      v-for="name in tabNames"
      :key="name"
      :name="name"
      @click="changeTab"
    ></tab>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.footer {
  width: 100%;
  display: flex;
  justify-content: space-around;
  border-top: 1px solid variables.$chipOutline;
  padding: 0;

  flex-shrink: 0;
  position: sticky;
  bottom: 0;

  z-index: 500;
}
</style>
