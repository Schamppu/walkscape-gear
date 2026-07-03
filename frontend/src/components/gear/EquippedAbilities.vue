<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { collectEquippedAbilityIds } from "@/domain/abilities/equippedAbilities";
import AbilitiesDisplay from "@/components/common/abilities/AbilitiesDisplay.vue";

const gearStore = useGearStore();

// Ability ids from every equipped item (pets gate by level; other gear lists
// ability ids directly). Attribute-granting abilities contribute to stats
// (passive always, active unless toggled off); the rest are informational.
const abilities = computed(() =>
  collectEquippedAbilityIds(gearStore.equippedGear),
);
</script>

<template>
  <details v-if="abilities.length" open>
    <summary>Abilities</summary>
    <abilities-display :abilities="abilities" :show-toggle="true" />
  </details>
</template>
