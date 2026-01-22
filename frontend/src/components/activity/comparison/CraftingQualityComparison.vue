<script setup>
import { ref, computed } from "vue";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import getOutcomeOdds from "@/utils/qualityOutcomeOdds";
import { useRequirements } from "@/composables/useRequirements";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";

const props = defineProps({
  useFineMaterials: Boolean,
  borderClass: String,
  gs1Ctx: Object,
  gs2Ctx: Object,
});

const { getLevelRequirementsMap } = useRequirements();

const selectedComparison = ref(0);
const changeComp = (index) => (selectedComparison.value = index);

const craftingOdds = computed(() => {
  const lReqs = getLevelRequirementsMap(props.gs1Ctx.recipe.value.requirements);
  const levelReq = Object.values(lReqs)[0];

  const { qualityOutcome: qo1, craftsPerMaterial: cpm1 } = useSkillModifiers(
    props.gs1Ctx,
  );
  const { qualityOutcome: qo2, craftsPerMaterial: cpm2 } = useSkillModifiers(
    props.gs2Ctx,
  );

  const odds = getOutcomeOdds(levelReq, qo1.value, props.useFineMaterials);
  const odds2 = getOutcomeOdds(levelReq, qo2.value, props.useFineMaterials);

  const stats1 = odds.map((item) => {
    return {
      ...item,
      odds: `${n(item.value * 100, 2)}%`,
      materialsNeeded: item.crafts / cpm1.value,
    };
  });

  const stats2 = odds2.map((item) => {
    return {
      ...item,
      odds: `${n(item.value * 100, 2)}%`,
      materialsNeeded: item.crafts / cpm2.value,
    };
  });

  const out = stats1.map((value, index) => ({
    gs1: value,
    gs2: stats2[index],
    oddsComp: value.value - stats2[index].value,
    matsComp: stats2[index].materialsNeeded - value.materialsNeeded,
  }));
  return out;
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
        :left="gs1.odds"
        :right="gs2.odds"
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
