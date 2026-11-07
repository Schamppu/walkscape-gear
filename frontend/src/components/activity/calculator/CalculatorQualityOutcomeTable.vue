<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import {
  injectSkillModifiers,
  injectFineMaterials,
} from "@/composables/context/injectShared";
import WsLabel from "@/components/primitives/WsLabel.vue";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import { enrichOdds } from "@/domain/quality/expectedOutcomes";
import { getRecipeLevel } from "@/domain/recipe/recipeUtils";
import { n } from "@/utils/number";
import type { RecipeDetail } from "@/domain/types/recipe";

const props = defineProps<{ crafts: number }>();

const activityStore = useActivityStore();
const { recipe } = storeToRefs(activityStore);
const { qualityOutcome } = injectSkillModifiers();
const { fineMode } = injectFineMaterials();

const craftingOdds = computed(() =>
  enrichOdds(
    getOutcomeOdds(
      getRecipeLevel((recipe.value as RecipeDetail).requirements),
      qualityOutcome.value,
      fineMode.value,
    ),
    props.crafts,
  ),
);
</script>

<template>
  <div class="wrapper">
    <ws-label label="Expected outcomes" />
    <label>
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
