<script setup>
import { computed, ref, onMounted } from "vue";
import { craftingQualityOptions, qualityOptions } from "@/utils/quality";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  item: Object,
  qualities: Number,
});

const defaultQuality = qualityOptions[0].value;
const itemsStore = useItemsStore();
const isOwned = ref(false);
const quality = ref("");
const quality2 = ref("");

onMounted(() => {
  const entry = itemsStore.ownedItems[props.item.id];
  isOwned.value = entry?.owned ?? false;
  quality.value = entry?.quality ?? defaultQuality;
  quality2.value = entry?.quality2 ?? defaultQuality;
});

const colorClass = `color-${quality.value}`;
const ownedBgClass = computed(() => {
  return isOwned.value && quality.value ? `bg-${quality.value}-dark` : "";
});

const toggleChecked = () => {
  isOwned.value = !isOwned.value;
  const { id: itemId } = props.item;
  itemsStore.toggleItem(itemId, isOwned.value, quality.value, quality2.value);
};

const updateQuality = () => {
  const { id: itemId } = props.item;
  itemsStore.toggleItem(itemId, isOwned.value, quality.value, quality2.value);
};
</script>

<template>
  <div :class="['item-entry', colorClass, ownedBgClass]" @click="toggleChecked">
    <div class="base-info">
      <input type="checkbox" :checked="isOwned" readonly />
      <ws-icon :iconPath="item.icon" />
      <span :class="`color-${item.quality}`">{{ item.name }}</span>
    </div>

    <div v-if="qualities > 0" class="quality-inputs">
      <select v-model="quality" @click.stop @change="updateQuality">
        <option
          v-for="q in craftingQualityOptions"
          :key="'q1-' + q.value"
          :value="q.value"
          :class="`color-${q.value}`"
        >
          {{ q.name }}
        </option>
      </select>
      <select
        v-if="qualities === 2"
        v-model="quality2"
        @click.stop
        @change="updateQuality"
      >
        <option
          v-for="q in craftingQualityOptions"
          :key="'q2-' + q.value"
          :value="q.value"
          :class="`color-${q.value}`"
        >
          {{ q.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.item-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;

  cursor: pointer;

  background-color: variables.$boxDarkBackground;
  border-radius: variables.$sm;
  border: 1px solid variables.$bgPrimary;

  padding: variables.$xxxs variables.$xxs;

  .base-info {
    display: flex;
    align-items: center;
    gap: variables.$xxs;
  }

  .quality-inputs {
    display: flex;
    align-items: flex;
    gap: variables.$xs;
  }
}
</style>
