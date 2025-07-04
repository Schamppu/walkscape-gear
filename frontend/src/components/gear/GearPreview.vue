<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { getWikiUrl } from "@/utils/wiki";
import { toDeepRaw } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";
import WsIcon from "@/components/common/WsIcon.vue";
import StatRequirementDisplay from "./StatRequirementDisplay.vue";

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

const emit = defineEmits(["unequip"]);

const gearStore = useGearStore();

const item = computed(() => gearStore.gearSlots[props.slotName]);

const attrs = computed(() => {
  const itemCopy = toDeepRaw(item.value);
  return sumAttrs(
    toDeepRaw(itemCopy.itemAttrs),
    toDeepRaw(itemCopy.itemQualityAttrs),
    toDeepRaw(itemCopy.buffs),
    itemCopy.quality
  ).flatMap(({ stats, requirements }) => {
    return stats.flatMap((stat) => {
      return { stat, requirements: requirements || [] };
    });
  });
});
</script>

<template>
  <div v-if="gearStore.slotFilled(slotName)" class="preview-wrapper">
    <div class="header">
      <div class="base-info">
        <ws-icon :icon-path="item.icon" />
        <p>
          {{ item.name }} (<a :href="getWikiUrl(item.name)" target="_blank"
            >wiki</a
          >)
        </p>
      </div>
      <button class="unequip" @click="emit('unequip')">Unequip</button>
    </div>
    <div class="stats">
      <stat-requirement-display
        v-for="({ stat, requirements }, key) in attrs"
        :key="key"
        :stat="stat"
        :requirements="requirements"
      />
    </div>
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
  gap: $lg;

  .header {
    width: 100%;
    display: flex;
    justify-content: center;
    gap: $xxlg;

    .base-info {
      padding: 0;
      display: flex;
      align-items: center;
      align-self: center;
      gap: $md;
    }
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

.stats {
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
