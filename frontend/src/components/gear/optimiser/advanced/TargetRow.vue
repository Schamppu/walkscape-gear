<script setup lang="ts">
import { ref, watch } from "vue";
import { X_VALUES, Y_VALUES } from "@/domain/advancedOptimiser/config";
import type { Target, XValue, YValue } from "@/domain/advancedOptimiser/config";
import { isXValid, isYValid, isTargetValid } from "@/domain/advancedOptimiser/targets";
import type { TargetContext } from "@/domain/advancedOptimiser/targets";
import { X_LABELS, Y_LABELS } from "@/constants/advancedOptimiser/targets";
import { computed } from "vue";

const props = defineProps<{
  target: Target;
  context: TargetContext;
}>();

const emit = defineEmits<{
  remove: [];
  "update:target": [patch: Partial<Target>];
}>();

const localWeight = ref(props.target.weight);
watch(
  () => props.target.weight,
  (v) => {
    localWeight.value = v;
  },
);

const validXValues = computed(() => {
  const valid = X_VALUES.filter((x) => isXValid(x, props.context));
  if (!valid.includes(props.target.x)) return [props.target.x, ...valid];
  return valid;
});

const validYValues = computed(() => {
  const valid = Y_VALUES.filter((y) => {
    if (!isYValid(y, props.context)) return false;
    if (props.target.x === "eternalCrafts" && y !== "material") return false;
    return true;
  });
  if (!valid.includes(props.target.y)) return [props.target.y, ...valid];
  return valid;
});

const onXChange = (e: Event) => {
  const x = (e.target as HTMLSelectElement).value as XValue;
  const patch: Partial<Target> = { x };
  const yStillValid = isYValid(props.target.y, props.context) && isTargetValid({ x, y: props.target.y, weight: props.target.weight }, props.context);
  if (!yStillValid) {
    const firstY = Y_VALUES.find(
      (y) => isYValid(y, props.context) && isTargetValid({ x, y, weight: props.target.weight }, props.context),
    );
    if (firstY) patch.y = firstY;
  }
  emit("update:target", patch);
};

const onYChange = (e: Event) => {
  emit("update:target", { y: (e.target as HTMLSelectElement).value as YValue });
};

const onWeightInput = (e: Event) => {
  localWeight.value = parseInt((e.target as HTMLInputElement).value, 10);
};

const onWeightChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(val)) emit("update:target", { weight: Math.min(10, Math.max(0, val)) });
};
</script>

<template>
  <div class="target-row">
    <select :value="target.x" class="target-select" @change="onXChange">
      <option v-for="x in validXValues" :key="x" :value="x">{{ X_LABELS[x] ?? x }}</option>
    </select>
    <span class="per-label">per</span>
    <select :value="target.y" class="target-select" @change="onYChange">
      <option v-for="y in validYValues" :key="y" :value="y">{{ Y_LABELS[y] ?? y }}</option>
    </select>
    <div class="weight-group">
      <input
        type="range"
        :value="localWeight"
        min="0"
        max="10"
        step="1"
        class="weight-slider"
        @input="onWeightInput"
        @change="onWeightChange"
      />
      <span class="weight-badge">{{ localWeight }}</span>
    </div>
    <button class="remove-btn" title="Remove target" @click.stop="emit('remove')">&#x2715;</button>
  </div>
</template>

<style lang="scss" scoped>
.target-row {
  display: flex;
  align-items: center;
  gap: $sm;
  padding: $xs 0;
  border-bottom: 1px solid $boxPrimaryOutline;

  &:last-child {
    border-bottom: none;
  }
}

.target-select {
  flex: 1;
  min-width: 0;
  padding: $xxxs $xxs;
  border-radius: $sm;
  border: 1px solid $boxPrimaryOutline;
  background-color: $boxDarkBackground;
  color: inherit;
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: 1px solid $chipOutline;
  }
}

.per-label {
  flex-shrink: 0;
  opacity: 0.5;
  font-size: 0.8rem;
}

.weight-group {
  display: flex;
  align-items: center;
  gap: $xs;
  flex-shrink: 0;
}

.weight-slider {
  width: 80px;
  cursor: pointer;
  accent-color: $txPositive;
}

.weight-badge {
  min-width: 1.5em;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.remove-btn {
  flex-shrink: 0;
  padding: $xxxs $xxs;
  border-radius: $sm;
  border: 1px solid $boxPrimaryOutline;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  line-height: 1;

  &:hover {
    opacity: 1;
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
