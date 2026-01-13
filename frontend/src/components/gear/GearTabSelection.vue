<script setup>
import { useGearStore } from "@/store/gear";
import { useGearSetStore } from "@/store/gearSet";

const gearStore = useGearStore();
const gearSetStore = useGearSetStore();

const handleClick = (idx) => {
  gearStore.gearSetIndex = idx;
  gearSetStore.gearSetIndex = idx;
};
</script>

<template>
  <div class="tabs">
    <button
      :class="['tab', { active: gearStore.gearSetIndex === 0 }]"
      @click="handleClick(0)"
    >
      Gear Set 1
    </button>
    <button
      :class="['tab', { active: gearStore.gearSetIndex === 1 }]"
      @click="handleClick(1)"
    >
      Gear Set 2
    </button>
  </div>
</template>

<style lang="scss" scoped>
.tabs {
  display: flex;
  margin-bottom: $lg;
}

.tab {
  width: 100%;
  display: flex;
  padding: $lg;
  gap: $sm;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: $boxPrimaryBackground;
  }

  &.active {
    background-color: $boxDarkBackground;
  }
}
</style>
