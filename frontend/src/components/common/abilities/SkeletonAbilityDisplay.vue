<script setup>
import WsIcon from "@/components/primitives/WsIcon.vue";

const props = defineProps({
  ability: Object,
});
</script>

<template>
  <div class="ability">
    <ws-icon :icon-path="props.ability?.icon" />
    <p>{{ props.ability.name }}</p>
  </div>
</template>

<style lang="scss" scoped>
.ability {
  display: flex;
  gap: $sm;
  padding: $xxxxs $xs;
  border-radius: $xxxs;
  color: $txLighter;

  background-color: $boxDarkBackground;
}
</style>
