<script setup lang="ts">
import { ref, computed } from "vue";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import { getOutcomeOdds } from "@/domain/quality/qualityOutcomeOdds";
import { buildCraftingOddsComparison } from "@/domain/comparison/craftingQualityComparison";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number";
import type { FineMaterialsMode } from "@/domain/quality/qualityOutcomeOdds";
import type { BaseContext } from "@/composables/context/useBaseContext";
import type { RecipeDetail } from "@/domain/types/recipe";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";

const props = defineProps<{
  fineMode: FineMaterialsMode;
  borderClass?: string;
  gs1Ctx: BaseContext;
  gs2Ctx: BaseContext;
}>();

const selectedComparison = ref(0);
const changeComp = (index: number) => (selectedComparison.value = index);

const craftingOdds = computed(() => {
  const lReqs = getLevelRequirementsMap((props.gs1Ctx.recipe.value as RecipeDetail).requirements);
  const levelReq = Object.values(lReqs)[0];

  const { qualityOutcome: qo1, craftsPerMaterial: cpm1 } = useSkillModifiers(
    props.gs1Ctx as unknown as SkillModifiersContext,
  );
  const { qualityOutcome: qo2, craftsPerMaterial: cpm2 } = useSkillModifiers(
    props.gs2Ctx as unknown as SkillModifiersContext,
  );

  const stats1 = getOutcomeOdds(
    levelReq,
    qo1.value,
    props.fineMode,
    cpm1.value,
  );
  const stats2 = getOutcomeOdds(
    levelReq,
    qo2.value,
    props.fineMode,
    cpm2.value,
  );

  return buildCraftingOddsComparison(stats1, stats2);
});
</script>

<template>
  <comparison-table-shell
    title="Quality Comparison"
    wrapped
    :border-class="borderClass"
  >
    <template #prefix>
      <div class="buttons">
        <button
          :class="[
            'select',
            'border-common',
            { active: selectedComparison === 0 },
          ]"
          @click="changeComp(0)"
        >
          <p>Materials needed</p>
        </button>
        <button
          :class="[
            'select',
            'border-common',
            { active: selectedComparison === 1 },
          ]"
          @click="changeComp(1)"
        >
          <p>Crafting Odds</p>
        </button>
      </div>
    </template>
    <template
      v-for="({ gs1, gs2, oddsComp, matsComp }, index) in craftingOdds"
      :key="index"
    >
      <comparison-value-row
        v-if="selectedComparison === 0"
        :title="gs1.name"
        :title-class="`color-${gs1.qualityValue}`"
        :left="n(gs1.materialsNeeded, 1)"
        :right="n(gs2.materialsNeeded, 1)"
        :comp="matsComp"
        :reverse="true"
      />
      <comparison-value-row
        v-if="selectedComparison === 1"
        :title="gs1.name"
        :title-class="`color-${gs1.qualityValue}`"
        :left="`${n(gs1.odds, 2)}%`"
        :right="`${n(gs2.odds, 2)}%`"
        :comp="oddsComp"
      />
    </template>
  </comparison-table-shell>
</template>

<style lang="scss" scoped>
.buttons {
  display: flex;
  gap: $lg;
  justify-content: center;
  margin: $sm 0;
}

.select {
  cursor: pointer;
  gap: $xs;
  border-radius: $sm;
  padding: $xxxxs $xxxs;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}

.select.active {
  background-color: $boxDarkOutline;
}
</style>
