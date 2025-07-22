<script setup>
import { ref, computed } from "vue";
import { useGearSetStore } from "@/store/gearSet";
import { useGearStore } from "@/store/gear";
import GearSetDropdown from "./GearSetDropdown.vue";

const gearSetStore = useGearSetStore();
const gearStore = useGearStore();

const selectedSetId = ref(null);
const newSetName = ref("");
const newSetTags = ref([]);
const isSavingNew = ref(false);

const selectedSet = computed(() =>
  gearSetStore.gearSets.find((set) => set.id === selectedSetId.value)
);

function handleNewSet() {
  isSavingNew.value = true;
  newSetName.value = "";
  newSetTags.value = [];
}

const getSetItems = () => {
  const excluded = ["consumable", "potion", "service"];
  return Object.entries(gearStore.gearSlots)
    .filter(([slot, item]) => !excluded.includes(slot) && item)
    .map(([slot, item]) => {
      const match = slot.match(/^([a-zA-Z]+)(\d+)?$/);
      const [slotType, slotIndex] = match
        ? [match[1], match[2] - 1 || 0]
        : ["", ""];

      return {
        slot,
        slotType,
        slotIndex,
        itemId: item?.id || null,
        quality: item?.quality || null,
      };
    });
};

function saveNewSet() {
  gearSetStore.addGearSet({
    name: newSetName.value,
    tags: newSetTags.value,
    items: getSetItems(),
  });
  isSavingNew.value = false;
}

function updateCurrentSet() {
  gearSetStore.addGearSet({
    id: selectedSetId.value,
    name: newSetName.value,
    tags: newSetTags.value,
    items: getSetItems(),
  });
  isSavingNew.value = false;
}
</script>

<template>
  <div class="gear-set-manager">
    <div class="row">
      <button class="button" @click="saveNewSet" :disabled="!newSetName">
        Save
      </button>
      <gear-set-dropdown v-model="selectedSetId" @new-set="handleNewSet" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.gear-set-manager {
  display: flex;
  flex-direction: column;
  gap: $base;

  .row {
    display: flex;
    align-items: center;
    gap: $base;
  }
}

.button {
  cursor: pointer;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;
  padding: $sm $xlg;

  &:hover {
    background-color: $boxTransparentDarkBackground;
  }
}
</style>
