<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import AbilitiesDisplay from "@/components/common/abilities/AbilitiesDisplay.vue";

const gearStore = useGearStore();

// The pet currently in the pet slot; its unlocked abilities contribute to
// stats (passive always, active unless toggled off).
const pet = computed(() => gearStore.selectedGearset.pet);

const abilities = computed(() => {
  const p = pet.value;
  if (!p?.abilities?.length) return [];
  const level = Number(p.quality) || 0;
  return p.abilities
    .filter(({ unlockLevel }) => unlockLevel <= level)
    .map(({ ability }) => ability);
});
</script>

<template>
  <details v-if="abilities.length" open>
    <summary>Pet Abilities</summary>
    <abilities-display :abilities="abilities" :show-toggle="true" />
  </details>
</template>
