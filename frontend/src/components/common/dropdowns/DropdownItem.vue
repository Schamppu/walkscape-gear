<script setup>
import LabelWithIcon from "../LabelWithIcon.vue";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["select"]);

function handleClick() {
  emit("select", props.item);
}
</script>

<template>
  <li>
    <button class="dropdown-item" @click="handleClick">
      <LabelWithIcon :icon="item.icon" :text="item.value" />
    </button>
  </li>
</template>

<style lang="scss" scoped>
.dropdown-item {
  cursor: pointer;
  width: 100%;
  padding: $xxs 0;
  transition: background 0.2s ease;
  background-color: $boxTransparentDarkBackground;

  &:hover {
    background-color: $chipBackground;
  }
}
</style>
