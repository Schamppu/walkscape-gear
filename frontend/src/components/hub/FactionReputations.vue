<script setup lang="ts">
import FactionReputationDisplay from "./FactionReputationDisplay.vue";
import { useFactionInfo } from "@/composables/useFactionInfo";

const { reputationFactions, saveFactionReputations } = useFactionInfo();
</script>

<template>
  <details open>
    <summary class="typography-h4">Faction Reputation</summary>
    <div class="skill-type">
      <div class="faction-bubbles">
        <faction-reputation-display
          v-for="faction in reputationFactions"
          :key="faction.id"
          :faction="faction"
          @input="saveFactionReputations"
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

.faction-bubbles {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;

  column-gap: $md;
  row-gap: $md;
}
</style>
