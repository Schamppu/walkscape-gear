<script setup>
import { computed } from "vue";
import WsLabel from "../../primitives/WsLabel.vue";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import { n } from "@/utils/number";

const props = defineProps({
  levelRequirement: Object,
  fineMode: String,
  qualityOutcome: Number,
  craftsPerMaterial: Number,
});

const craftingOdds = computed(() => {
  const { level: levelReq } = props.levelRequirement;
  return getOutcomeOdds(
    levelReq,
    props.qualityOutcome,
    props.fineMode,
    props.craftsPerMaterial,
  );
});
</script>

<template>
  <ws-label label="Crafting Odds" />
  <table class="quality-odds-table">
    <thead>
      <tr>
        <th>Quality</th>
        <th>Chance</th>
        <th>Avg. Crafts</th>
        <th>Avg. Materials Needed</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) in craftingOdds" :key="`${item.name}-${index}`">
        <td :class="`color-${item.qualityValue}`">{{ item.name }}</td>
        <td>{{ `${n(item.odds, 2)}%` }}</td>
        <td>{{ n(item.crafts, 1) }}</td>
        <td>{{ n(item.materialsNeeded, 1) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style lang="scss" scoped>
.quality-odds-table {
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: $xxs $sm;
    border-bottom: 1px solid $chipOutline;
    text-align: center;
  }
  th {
    background: $boxPrimaryBackground;
  }
}
</style>
