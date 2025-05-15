<script setup>
import { computed } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  id: { type: [String, Number], required: true },
  icon: { type: String, default: null },
  getValue: { type: Function, required: true },
  setValue: { type: Function, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  defaultValue: { type: Number, default: 0 },
  borderClass: { type: String, default: null },
});

const value = computed({
  get: () => props.getValue(props.id),
  set: (val) => {
    const clamped = Math.min(props.max, Math.max(props.min, Number(val)));
    props.setValue(props.id, clamped);
  },
});
</script>

<template>
  <div :class="['wrapper', borderClass]">
    <ws-icon v-if="icon" :iconPath="icon" size="md" />
    <input
      v-model="value"
      class="input"
      type="number"
      :min="min"
      :max="max"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/utils/variables.scss";

.wrapper {
  display: flex;
  padding: variables.$xs;
  gap: variables.$xs;
  border-radius: variables.$xs;
  border: solid 1px white;
  background: variables.$boxDarkBackground;
}

.input {
  color: variables.$txLighter;
  background: variables.$boxPrimaryBackground;
}

input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}
</style>
