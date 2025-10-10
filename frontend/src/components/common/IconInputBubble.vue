<script setup>
import { ref, watch } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import WsLabel from "@/components/common/WsLabel.vue";

const emit = defineEmits(["input"]);

const props = defineProps({
  id: { type: [String, Number], required: true },
  icon: { type: String, default: null },
  label: { type: String, default: null },
  getValue: { type: Function, required: true },
  setValue: { type: Function, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  defaultValue: { type: Number, default: 0 },
  borderClass: { type: String, default: null },
  borderColor: { type: String, default: null },
});

const localValue = ref(props.getValue(props.id));

watch(
  () => props.getValue(props.id),
  (val) => {
    if (val !== localValue.value) localValue.value = val;
  }
);

function onInput(e) {
  // Let the user type freely, including out-of-range values
  localValue.value = e.target.value;
}

function onBlur() {
  let val = localValue.value;

  // If empty or invalid, reset to min
  if (val === "" || isNaN(Number(val))) {
    localValue.value = props.min;
    props.setValue(props.id, props.min);
    emit("input", props.min);
    return;
  }

  val = Number(val);
  // Clamp to min/max
  const clamped = Math.max(props.min, Math.min(props.max, val));
  if (clamped !== val) {
    localValue.value = clamped;
  }
  props.setValue(props.id, clamped);
  emit("input", clamped);
}
</script>

<template>
  <div class="label-wrapper">
    <ws-label v-if="label" :label="label" />
    <div
      :class="['wrapper', borderClass]"
      :style="borderColor ? { border: `2px solid ${borderColor}` } : undefined"
    >
      <ws-icon v-if="icon" :iconPath="icon" size="md" />
      <input
        :value="localValue"
        @input="onInput"
        @blur="onBlur"
        class="input"
        type="number"
        :min="min"
        :max="max"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.wrapper {
  display: flex;
  padding: $xs;
  gap: $xs;
  border-radius: $xs;
  border: solid 1px white;
  background: $boxDarkBackground;
}

.input {
  color: $txLighter;
  background: $boxPrimaryBackground;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
