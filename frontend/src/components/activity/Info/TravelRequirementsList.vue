<script setup>
import WsIcon from "@/components/primitives/WsIcon.vue";

const props = defineProps({
  title: { type: String, default: "" },
  requirements: {
    type: Array,
    required: true,
  },
});
</script>

<template>
  <div v-if="props.requirements?.length">
    <p v-if="props.title">{{ title }}</p>
    <p
      v-for="({ prefix, text, icon }, idx) in props.requirements"
      :key="`${idx}-${text}`"
      class="requirement"
    >
      <template v-if="prefix">{{ prefix }} </template>
      <ws-icon v-if="icon" :iconPath="icon" size="sm" />
      <span class="main-text">{{ text }}</span>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.requirement {
  display: block;
  text-align: left;
  padding: $xxxxs $xs;
  border-radius: $lg;
  color: $txLighter;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;

  :deep(.ws-icon) {
    margin-left: $xxxxs;
    vertical-align: middle;
  }

  .main-text {
    margin-left: $xxxxs;
  }

  &.disabled {
    color: $txDarker;
  }
}
</style>
