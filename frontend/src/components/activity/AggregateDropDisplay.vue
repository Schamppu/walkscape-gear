<script setup>
import { computed } from "vue";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";
import InfoBubble from "@/components/common/InfoBubble.vue";
import useBaseContext from "@/composables/useBaseContext";
import { useLootTables } from "@/composables/useLootTables";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";
import { tokenValues } from "@//constants/tokenValues";

const props = defineProps({
  type: {
    type: String,
    validator: (value) => ["money", "token"].includes(value),
  },
});

const ctx = useBaseContext();
const { dropItemInfoMap } = useLootTables(ctx);

const dataStore = useDataStore();
const itemsStore = useItemsStore();

const materialValue = (id, itemInfo, valueSource) => {
  const { stepsPerNormal, stepsPerFine } = itemInfo;
  const normalPerStep = 1000 / stepsPerNormal;
  if (stepsPerFine) {
    const finePerStep = 1000 / stepsPerFine;
    const { common, fine } = valueSource[id];
    return common * normalPerStep + fine * finePerStep;
  } else if (id in valueSource) {
    const { common } = valueSource[id];
    return common * normalPerStep;
  }
};

const goldTotal = computed(() => {
  const data = Object.entries(dropItemInfoMap.value);

  const sum = data.reduce((total, [id, info]) => {
    if (id === "gold") {
      return total + info.itemsPerStep;
    } else if (id in itemsStore.allGearItems) {
      const { quality } = itemsStore.allGearItems[id];
      const { itemsPerStep } = info;
      const prices = dataStore.itemValues[id];

      return total + itemsPerStep * prices[quality];
    } else if (id in dataStore.itemValues) {
      return total + materialValue(id, info, dataStore.itemValues);
    }
    return total;
  }, 0);

  return sum;
});

const tokenTotal = computed(() => {
  const data = Object.entries(dropItemInfoMap.value);
  const out = data
    .filter(([id]) => id in tokenValues)
    .map(([id, info]) => materialValue(id, info, tokenValues))
    .reduce((a, b) => a + b, 0);
  return out;
});

const displayValue = computed(() => {
  if (props.type === "money") return n(goldTotal.value, 2);
  if (props.type === "token") return n(tokenTotal.value, 2);
  return "";
});

const icon = computed(() => {
  if (props.type === "money") return icons.money;
  if (props.type === "token") return icons.token;
  return "";
});

const tooltip = computed(() => {
  if (props.type === "money") return `${displayValue.value} money per 1k steps`;
  if (props.type === "token")
    return `${displayValue.value} adventurer's guild tokens per 1k steps`;
  return "";
});
</script>

<template>
  <info-bubble
    v-if="displayValue !== '0'"
    :text="displayValue"
    :icon-path="icon"
    :tooltip="tooltip"
  />
</template>

<style lang="scss" scoped></style>
