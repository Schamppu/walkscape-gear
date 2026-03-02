<script setup>
import { toRef } from "vue";
import LoadingThrobber from "@/components/primitives/LoadingThrobber.vue";

const props = defineProps({
  title: {
    type: String,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const loading = toRef(props, "isLoading");
</script>

<template>
  <div class="tab-wrapper">
    <div v-if="loading">
      <loading-throbber />
    </div>
    <slot v-else class="tab-content"></slot>
  </div>
</template>

<style lang="scss" scoped>
.tab-wrapper {
  width: 100%;
  box-sizing: border-box;

  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: $base;

  background-color: $bgPrimary;
  padding: $xlg $xxs;
}

.tab-content {
  flex-grow: 1;

  display: flex;
  flex-direction: column;
  gap: $xlg;
  justify-content: center;
}
</style>
