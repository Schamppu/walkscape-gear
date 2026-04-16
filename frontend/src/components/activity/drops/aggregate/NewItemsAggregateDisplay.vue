<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/store/settings";
import { useItemsStore } from "@/store/items";
import ExpandableValueBubble from "../ExpandableValueBubble.vue";
import { injectLootTables } from "@/composables/context/injectShared";
import {
  computeNewItems,
  computeStepsPerAnyNewItem,
} from "@/domain/drops/stepsPerNewItem";
import { icons } from "@/constants/iconPaths";
import { n } from "@/utils/number";
import type { ChestLootTableInfo } from "@/composables/useChestLootTables";

const props = defineProps<{
  chestLootTables: ChestLootTableInfo[];
}>();

const settingsStore = useSettingsStore();
const { activitySettings } = storeToRefs(settingsStore);
const itemsStore = useItemsStore();
const { dropItemInfoMap } = injectLootTables();

const showChests = computed(() => activitySettings.value.showChestLootTables?.value === true);

const newItems = computed(() =>
  computeNewItems(
    dropItemInfoMap.value,
    showChests.value ? props.chestLootTables : [],
    itemsStore.ownedItems,
    itemsStore.allGearItems,
  ),
);

const combinedSteps = computed(() => computeStepsPerAnyNewItem(newItems.value));

const breakdown = computed(() =>
  newItems.value.map((item) => ({
    icon: item.icon,
    label: item.id,
    value: item.stepsPerItem,
  })),
);
</script>

<template>
  <expandable-value-bubble
    v-if="newItems.length > 0"
    :text="n(combinedSteps, 0)"
    :icon-path="icons.steps"
    :tooltip="`~${n(combinedSteps, 0)} steps for new item`"
    label="new item"
    :breakdown="breakdown"
    breakdown-type="steps"
  />
</template>
