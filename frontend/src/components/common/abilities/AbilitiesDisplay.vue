<script setup>
import DetailedAbilityDisplay from "./DetailedAbilityDisplay.vue";
import SkeletonAbilityDisplay from "./SkeletonAbilityDisplay.vue";
import { useDataStore } from "@/store/data";
import { computed, watch } from "vue";

const props = defineProps({
  abilities: Array,
  // Forwarded to DetailedAbilityDisplay: show enable/disable toggles for
  // active, attribute-granting abilities.
  showToggle: { type: Boolean, default: false },
});

const dataStore = useDataStore();

// Derived from the store so a skeleton flips to detail as soon as the ability's
// details land in `detailedAbilitiesMap` (reactive), rather than relying on a
// one-shot fetch callback.
const detailedAvailable = computed(() =>
  Object.fromEntries(
    (props.abilities ?? []).map((ability) => [
      ability,
      ability in dataStore.detailedAbilitiesMap,
    ]),
  ),
);

// Fetch details whenever the set of abilities changes (e.g. the pet or its
// level changed); resolved details populate the store and drive the computed.
watch(
  () => props.abilities,
  (abilities) => {
    if (abilities?.length) void dataStore.fetchDetailedAbilities(abilities);
  },
  { immediate: true },
);
</script>

<template>
  <div class="abilities">
    <div v-for="ability in props.abilities" :key="ability">
      <detailed-ability-display
        v-if="detailedAvailable[ability]"
        :ability="dataStore.detailedAbilitiesMap[ability]"
        :show-toggle="props.showToggle"
      />
      <skeleton-ability-display
        v-else
        :ability="dataStore.abilitiesMap[ability]"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.abilities {
  display: flex;
  flex-direction: column;
  gap: $xxxs;
  margin: $xxs 0 $xs $xs;
}
</style>
