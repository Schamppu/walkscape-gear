<script setup>
import { computed } from "vue";
import WsLabel from "../common/WsLabel.vue";
import { craftingQualityOptions } from "@/constants/quality";
import { n } from "@/utils/number";

const props = defineProps({
  levelRequirement: Object,
  useFineMaterials: Boolean,
  qualityOutcome: Number,
  craftsPerMaterial: Number,
});

const craftingOdds = computed(() => {
  const { level: levelReq } = props.levelRequirement;
  const weights = [
    [1000, 4],
    [200, 4],
    [50, 4],
    [10, 4],
    [2.5, 2],
    [0.05, 0.05],
  ];

  let base = craftingQualityOptions
    .map((quality, index) => ({
      ...quality,
      qualityValue: quality.value,
      bandStart: index * 100,
      bandEnd: (index + 1) * (100 + levelReq),
      weightStart: weights[index][0],
      weightEnd: weights[index][1],
    }))
    .map((item) => {
      const { bandStart, bandEnd, weightStart, weightEnd } = item;
      return {
        ...item,
        slope: (weightStart - weightEnd) / (bandStart - bandEnd),
      };
    })
    .map((item) => {
      const { weightEnd, weightStart, slope, bandStart } = item;
      return {
        ...item,
        weight:
          props.qualityOutcome < bandStart
            ? weightStart
            : Math.max(
                weightEnd,
                weightStart + slope * (props.qualityOutcome - bandStart)
              ),
      };
    });

  if (!props.useFineMaterials) {
    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  } else {
    for (let i = 0; i < base.length - 1; i++) {
      base[i].name = base[i + 1].name;
      base[i].qualityValue = base[i + 1].qualityValue;
    }
    base[4].weight = base[4].weight + base[5].weight;
    base = base.slice(0, -1);

    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  }

  const totalWeight = base.reduce((acc, item) => acc + item.weight, 0);
  const odds = base
    .map((item) => {
      const { qualityValue, name, weight } = item;
      return {
        qualityValue,
        name,
        value: weight / totalWeight,
        crafts: totalWeight / weight,
      };
    })
    .map((item) => {
      return {
        ...item,
        odds: `${n(item.value * 100, 2)}%`,
        materialsNeeded: item.crafts / props.craftsPerMaterial,
      };
    });

  return odds;
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
