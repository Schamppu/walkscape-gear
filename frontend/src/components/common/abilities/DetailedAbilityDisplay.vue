<script setup>
import WsIcon from "../WsIcon.vue";

const props = defineProps({
  ability: Object,
});

const typeIconPaths = {
  passive: "assets/icons/text/general_icons/ability_passive.png",
  active: "assets/icons/text/general_icons/ability_active.png",
};
</script>

<template>
  <div class="ability">
    <ws-icon :icon-path="props.ability?.icon" size="mdp" />
    <div class="data">
      <div class="title">
        <ws-icon :icon-path="typeIconPaths[props.ability?.type]" size="xs" />
        <p class="type">{{ props.ability.type }}</p>
      </div>
      <p class="name">{{ props.ability.name }}</p>
    </div>
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

  .data {
    display: flex;
    flex-direction: column;
  }

  .title {
    display: flex;
    gap: $xxs;
    padding: $xxxxs 0;
    align-items: center;
  }

  .type {
    text-transform: uppercase;
    line-height: 16px;
    font-size: 12px;
  }
}
</style>
