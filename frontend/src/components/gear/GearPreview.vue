<script setup>
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/common/WsIcon.vue";
import { getWikiUrl } from "@/utils/wiki";
import AttributeDisplay from "@/components/hub/AttributeDisplay.vue";

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
const itemsStore = useItemsStore();

const item = gearStore.get(props.slotName);
const owned = item.id in itemsStore.ownedItems;
const quality = owned ? itemsStore.ownedItems[item.id].quality : item.quality;
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
    <attribute-display
      :itemAttrs="item.itemAttrs"
      :qualityAttrs="item.itemQualityAttrs"
      :quality="quality"
      :key="`attributes-q1-${quality}`"
    />
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
</style>