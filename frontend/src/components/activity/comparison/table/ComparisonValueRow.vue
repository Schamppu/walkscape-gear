<script setup>
import { computed } from "vue";

const props = defineProps({
  title: String,
  left: [String, Number],
  right: [String, Number],
  comp: Number,
  titleClass: { type: String, default: "" },
});

const leftClass = computed(() => ({
  positive: props.comp > 0,
  negative: props.comp < 0,
}));

const rightClass = computed(() => ({
  positive: props.comp < 0,
  negative: props.comp > 0,
}));
</script>

<template>
  <tr>
    <td :class="titleClass">{{ title }}</td>
    <td :class="leftClass">{{ left }}</td>
    <td :class="rightClass">{{ right }}</td>
  </tr>
</template>
