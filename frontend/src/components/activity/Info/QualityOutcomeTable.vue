<script setup>
import { computed } from "vue";
import WsLabel from "../../common/WsLabel.vue";
import getOutcomeOdds from "@/utils/qualityOutcomeOdds";
import { n } from "@/utils/number";

const props = defineProps({
  levelRequirement: Object,
  useFineMaterials: Boolean,
  qualityOutcome: Number,
  craftsPerMaterial: Number,
});

const craftingOdds = computed(() => {
  const { level: levelReq } = props.levelRequirement;
  const odds = getOutcomeOdds(
    levelReq,
    props.qualityOutcome,
    props.useFineMaterials
  );

  return odds.map((item) => {
    return {
      ...item,
      odds: `${n(item.value * 100, 2)}%`,
      materialsNeeded: item.crafts / props.craftsPerMaterial,
    };
  });
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
        <td>{{ item.odds }}</td>
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
