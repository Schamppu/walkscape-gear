<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import WsIcon from "@/components/common/WsIcon.vue";
import StatsDisplay from "@/components/common/StatsDisplay.vue";
import QualitySelection from "./QualitySelection.vue";
import { getPetIcon } from "@/utils/pets";

const props = defineProps({
  gearType: {
    type: String,
    required: true,
  },
  slotName: {
    type: String,
    required: true,
  },
});

defineEmits(["unequip", "close"]);

const gearStore = useGearStore();

const item = computed(() => gearStore.selectedGearset[props.slotName]);
const type = computed(() => ("egg" in item.value ? "pet" : item.value.type));
const icon = computed(() => {
  if (!("egg" in item.value)) return item.value.icon;

  return getPetIcon(
    item.value,
    item.value.quality,
    item.value.quality2 === "rare"
  );
});

const changeQuality = (quality) => {
  const newItem = {
    ...item.value,
    quality,
  };
  gearStore.setGearSlot(props.slotName, newItem);
};

const petLevelOptions = computed(() =>
  "egg" in item.value
    ? item.value.levels.map(({ level, stage }) => ({
        value: `${level}`,
        name: `lvl ${level}: ${stage}`,
      }))
    : null
);
</script>

<template>
  <div v-if="gearStore.slotFilled(slotName)" class="preview-wrapper">
    <div class="header">
      <div class="base-info">
        <ws-icon :icon-path="icon" />
        <p :class="[`color-${item.quality}`]">
          {{ item.name }}
        </p>
      </div>
      <button class="unequip" @click="$emit('unequip')">Unequip</button>
    </div>
    <quality-selection
      :type="type"
      :qualityOptions="petLevelOptions"
      @select-quality="changeQuality"
    />
    <stats-display :item="item" :quality="item.quality" showActiveColors />
  </div>
  <div v-else>
    <p>Select an item on the search tab</p>
  </div>
</template>

<style lang="scss" scoped>
.preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: $bgPrimary;
  border-radius: $sm $sm $lg $lg;
  border: 2px solid $boxDarkOutline;

  .header {
    background-color: $boxDarkBackground;
    width: 100%;
    display: flex;
    justify-content: center;
    gap: $xxlg;
    margin-bottom: $xxs;
    border-radius: calc($sm - 2px) calc($sm - 2px) 0 0;
    padding: $xxs;

    .base-info {
      padding: 0;
      display: flex;
      align-items: center;
      align-self: center;
      gap: $md;
    }

    .mid {
      display: flex;
      gap: $md;
    }
  }

  /* Ensure the last child (stats-display) respects bottom border radius */
  > :last-child {
    border-radius: 0 0 calc($lg - 2px) calc($lg - 2px);
    width: 100%;
  }
}

.unequip {
  cursor: pointer;
  border: 1px solid $txNegative;
  color: $txNegative;
  padding: $xxs $sm;
  border-radius: $sm;
  background: $boxDarkBackground;

  &:hover {
    background: $boxDarkOutline;
  }
}

.label-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  gap: $xxs;
  .label {
    margin-left: $xxs;
  }
}
</style>
