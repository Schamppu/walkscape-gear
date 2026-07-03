<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import AbilitiesDisplay from "@/components/common/abilities/AbilitiesDisplay.vue";

const gearStore = useGearStore();

// Collect ability ids from every equipped item. Two shapes exist:
// - pets carry `{ unlockLevel, ability }[]` gated by the pet's level (quality)
// - other gear carries a plain array of ability id strings
// Attribute-granting abilities contribute to stats (passive always, active
// unless toggled off); the rest are informational.
const abilities = computed(() => {
  const ids = new Set();
  for (const item of gearStore.equippedGear) {
    const list = item?.abilities;
    if (!list?.length) continue;
    const level = Number(item.quality) || 0;
    for (const entry of list) {
      if (typeof entry === "string") {
        ids.add(entry);
      } else if (entry?.ability && (entry.unlockLevel ?? 0) <= level) {
        ids.add(entry.ability);
      }
    }
  }
  return [...ids];
});
</script>

<template>
  <details v-if="abilities.length" open>
    <summary>Abilities</summary>
    <abilities-display :abilities="abilities" :show-toggle="true" />
  </details>
</template>
