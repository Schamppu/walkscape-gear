<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import useBaseContext from "@/composables/context/useBaseContext";
import { useRequirements } from "@/composables/useRequirements";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import WsLabel from "@/components/common/WsLabel.vue";
import getOutcomeOdds from "@/utils/qualityOutcomeOdds";
import { n } from "@/utils/number";

const props = defineProps({
  crafts: Number,
});

const activityStore = useActivityStore();
const itemsStore = useItemsStore();
const { recipe } = storeToRefs(activityStore);
const ctx = useBaseContext();
const { getLevelRequirementsMap } = useRequirements(ctx);
const { qualityOutcome } = useSkillModifiers(ctx);

const canUseFineMaterials = computed(() => {
  const upgraded = itemsStore.itemsByCategory["upgraded_crafted"].map(
    ({ id }) => id
  );
  const reward = Object.keys(recipe.value.itemRewards)[0];
  return !upgraded.includes(reward);
});

const craftingOdds = computed(() => {
  const levelMap = getLevelRequirementsMap(recipe.value.requirements);
  const level = Object.values(levelMap)[0];

  const odds = getOutcomeOdds(
    level,
    qualityOutcome.value,
    activityStore.useFineMaterials
  );
  return odds.map((item) => {
    return {
      ...item,
      odds1: 1 - (1 - item.value) ** props.crafts,
      avg: props.crafts * item.value,
    };
  });
});
</script>

<template>
  <div class="wrapper">
    <ws-label label="Expected outcomes" />
    <label v-if="canUseFineMaterials">
      <input type="checkbox" v-model="activityStore.useFineMaterials" />
      Fine Materials
    </label>
    <table class="quality-odds-table">
      <thead>
        <tr>
          <th>Quality</th>
          <th>Odds of 1</th>
          <th>Avg. Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in craftingOdds"
          :key="`${item.name}-${index}`"
        >
          <td :class="`color-${item.qualityValue}`">{{ item.name }}</td>
          <td>{{ n(item.odds1, 4) }}</td>
          <td>{{ n(item.avg, 1) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $xxs;
}

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
