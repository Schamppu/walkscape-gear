<script setup lang="ts">
import RealmLocationCountDisplay from "./RealmLocationCountDisplay.vue";
import { useFactionInfo } from "@/composables/useFactionInfo";

const { realms, saveRealmLocations } = useFactionInfo();
</script>

<template>
  <details>
    <summary class="typography-h4">Realm Locations</summary>
    <div class="skill-type">
      <div class="realm-bubbles">
        <realm-location-count-display
          v-for="realm in realms"
          :key="realm.id"
          :realm="realm"
          @input="saveRealmLocations"
        />
      </div>
    </div>
  </details>
</template>

<style lang="scss" scoped>
details[open] summary {
  margin-bottom: $md;
}

.skill-type {
  display: flex;
  flex-direction: column;
  gap: $sm;
}

.realm-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: $md;
  row-gap: $md;
}
</style>
