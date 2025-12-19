<script setup>
import DetailedAbilityDisplay from "./DetailedAbilityDisplay.vue";
import SkeletonAbilityDisplay from "./SkeletonAbilityDisplay.vue";
import { useDataStore } from "@/store/data";
import { ref } from "vue";

const props = defineProps({
  abilities: Array,
});

const dataStore = useDataStore();
const detailedAvailable = ref(
  Object.fromEntries(
    props.abilities.map((ability) => [
      ability,
      ability in dataStore.detailedAbilitiesMap,
    ])
  )
);

dataStore
  .fetchDetailedAbilities(props.abilities)
  .then((abilities) => {
    abilities.forEach(({ id }) => {
      detailedAvailable.value[id] = true;
    });
  })
  .catch((err) => console.error(err));
</script>

<template>
  <div class="abilities" v-for="ability in props.abilities" :key="ability">
    <detailed-ability-display
      v-if="detailedAvailable[ability]"
      :ability="dataStore.detailedAbilitiesMap[ability]"
    />
    <skeleton-ability-display
      v-else
      :ability="dataStore.abilitiesMap[ability]"
    />
  </div>
</template>

<style lang="scss" scoped>
.abilities {
  margin: $xxs 0 $xs $xs;
}
</style>
