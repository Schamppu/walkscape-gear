<script setup>
import useBaseContext from "@/composables/useBaseContext";
import WsIcon from "@/components/common/WsIcon.vue";
import { useRequirements } from "@/composables/useRequirements";
import { computed } from "vue";

const props = defineProps({
  requirement: Object,
});

const ctx = useBaseContext();
const { checkRequirements, mapRequirementsText } = useRequirements(ctx);
const fulfilled = computed(() => checkRequirements([props.requirement], ctx));
const reqText = computed(() =>
  mapRequirementsText([props.requirement], [fulfilled])
);

const borderClass = computed(() => {
  return fulfilled.value ? "border-green" : "border-red";
});
console.log(reqText.value);
</script>

<template>
  <div class="requirement-display">
    <p
      v-for="({ prefix, text, icon }, index) in reqText"
      :key="index"
      :class="['requirement', borderClass]"
    >
      <template v-if="prefix">{{ prefix }} </template>
      <ws-icon v-if="icon" :iconPath="icon" size="sm" />
      <span>{{ text }}</span>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.requirement {
  display: flex;
  justify-content: flex-start;
  text-align: left;
  align-items: center;
  padding: $xxxxs $xs;
  gap: $xxs;
  border-radius: $lg;
  flex-wrap: wrap;
  color: $txLighter;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;

  ws-icon {
    display: inline;
  }
}

.border-green {
  border: 1px solid $txPositive;
}

.border-red {
  border: 1px solid $txNegative;
}
</style>
