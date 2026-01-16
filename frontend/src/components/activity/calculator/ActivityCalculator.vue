<script setup>
import { ref, computed, reactive, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import useBaseContext from "@/composables/context/useBaseContext";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import WsIcon from "@/components/common/WsIcon.vue";
import WsLabel from "@/components/common/WsLabel.vue";
import CalculatorQualityOutcomeTable from "./CalculatorQualityOutcomeTable.vue";
import { levelFromXp, xpToLevelSkill } from "@/utils/skillXp";

const ctx = useBaseContext();
const {
  stepsPerAction,
  xpPerStep,
  xpRewards,
  noMaterialsConsumed,
  doubleRewards,
} = useSkillModifiers(ctx);
const playerStore = usePlayerStore();
const itemsStore = useItemsStore();

const activityStore = useActivityStore();
const { activity, recipe, activitySelected, recipeSelected } =
  storeToRefs(activityStore);
const source = computed(() =>
  activitySelected.value ? activity.value : recipe.value
);

const { skillLevels } = storeToRefs(playerStore);
const skillList = computed(() =>
  activitySelected.value
    ? Object.keys(source.value.xpRewardsMap)
    : Object.keys(source.value.xpRewards)
);

const steps = ref(0);

const actions = computed({
  get: () => steps.value / stepsPerAction.value,
  set: (val) => (steps.value = val * stepsPerAction.value),
});

const materialsInput = computed({
  get: () => actions.value * (1 - noMaterialsConsumed.value),
  set: (val) => {
    actions.value = val / (1 - noMaterialsConsumed.value);
  },
});

const materialsOutput = computed({
  get: () => actions.value * (1 + doubleRewards.value),
  set: (val) => {
    actions.value = val / (1 + doubleRewards.value);
  },
});

const resultHasCO = computed(() => {
  if (recipeSelected.value) {
    const [itemId] = Object.keys(recipe.value.itemRewards);
    return (
      itemId in itemsStore.allGearItems &&
      itemsStore.allGearItems[itemId].type === "crafted"
    );
  }
  return false;
});

const skillXpStartRefs = reactive({});
const skillXpGainRefs = reactive({});
const skillXpEndRefs = reactive({});
const skillLevelStartRefs = reactive({});
const skillLevelEndRefs = reactive({});

const getXpPerStepFor = (skill) =>
  xpPerStep.value.find((o) => o.skill === skill).value;

const getXpPerActionFor = (skill) =>
  xpRewards.value.find((o) => o.skill === skill).value;

watchEffect(() => {
  const list = skillList.value;

  // remove keys that are no longer present
  Object.keys(skillXpGainRefs).forEach((k) => {
    if (!list.find((s) => s === k)) {
      delete skillXpGainRefs[k];
      delete skillXpStartRefs[k];
    }
  });

  for (const s of list) {
    const perStep = getXpPerStepFor(s);
    const perAction = getXpPerActionFor(s);
    skillXpGainRefs[s] = computed({
      get: () => {
        return steps.value * perStep;
      },
      set: (val) => {
        actions.value = val / perAction;
      },
    });

    skillXpStartRefs[s] = xpToLevelSkill(skillLevels.value[s] - 1);
    skillLevelStartRefs[s] = computed({
      get: () => levelFromXp(skillXpStartRefs[s]),
      set: (val) => (skillXpStartRefs[s] = xpToLevelSkill(val - 1)),
    });

    skillXpEndRefs[s] = computed({
      get: () => {
        return skillXpStartRefs[s] + skillXpGainRefs[s];
      },
      set: (val) => {
        skillXpGainRefs[s] = Math.max(0, val - skillXpStartRefs[s]);
      },
    });
    skillLevelEndRefs[s] = computed({
      get: () => levelFromXp(skillXpEndRefs[s]),
      set: (val) => (skillXpEndRefs[s] = xpToLevelSkill(val - 1)),
    });
  }
});
</script>

<template>
  <details open>
    <summary>Calculator</summary>
    <section class="calculator">
      <div class="info-row">
        <icon-input-bubble
          label="steps"
          key="steps"
          id="steps"
          :max="1000000"
          :getValue="() => steps"
          :setValue="() => {}"
          @input="(val) => (steps = val)"
        />
        <icon-input-bubble
          label="actions"
          key="actions"
          id="actions"
          :max="1000000"
          :getValue="() => actions"
          :setValue="() => {}"
          @input="(val) => (actions = val)"
        />
        <icon-input-bubble
          v-if="recipeSelected"
          label="materials"
          key="materials"
          id="materials"
          :max="1000000"
          :getValue="() => materialsInput"
          :setValue="() => {}"
          @input="(val) => (materialsInput = val)"
        />
        <icon-input-bubble
          v-if="recipeSelected"
          label="crafts"
          key="crafts"
          id="crafts"
          :max="1000000"
          :getValue="() => materialsOutput"
          :setValue="() => {}"
          @input="(val) => (materialsOutput = val)"
        />
      </div>
      <div
        :class="['skill-row', `border-${skill}`]"
        v-for="skill in skillList"
        :key="skill"
      >
        <p class="skill-title">
          <ws-icon
            :iconPath="`assets/icons/text/skill_icons/${skill}.png`"
            size="sm"
          />
          <ws-label :label="skill" />
        </p>
        <div class="info-row">
          <icon-input-bubble
            label="start xp"
            :key="`${skill}-start-xp`"
            :id="`${skill}-start-xp`"
            :max="99999999"
            :getValue="() => skillXpStartRefs[skill]"
            :setValue="() => {}"
            @input="(val) => (skillXpStartRefs[skill] = val)"
          />
          <icon-input-bubble
            label="gained xp"
            :key="`${skill}-xp`"
            :id="`${skill}-xp`"
            :max="99999999"
            :getValue="() => skillXpGainRefs[skill]"
            :setValue="() => {}"
            @input="(val) => (skillXpGainRefs[skill] = val)"
          />
          <icon-input-bubble
            label="target xp"
            :key="`${skill}-target-xp`"
            :id="`${skill}-target-xp`"
            :max="99999999"
            :getValue="() => skillXpEndRefs[skill]"
            :setValue="() => {}"
            @input="(val) => (skillXpEndRefs[skill] = val)"
          />
          <icon-input-bubble
            label="start lvl"
            :key="`${skill}-start-lvl`"
            :id="`${skill}-start-lvl`"
            :max="99"
            :getValue="() => skillLevelStartRefs[skill]"
            :setValue="() => {}"
            @input="(val) => (skillLevelStartRefs[skill] = val)"
          />
          <icon-input-bubble
            label="end lvl"
            :key="`${skill}-end-lvl`"
            :id="`${skill}-end-lvl`"
            :max="99"
            :getValue="() => skillLevelEndRefs[skill]"
            :setValue="() => {}"
            @input="(val) => (skillLevelEndRefs[skill] = val)"
          />
        </div>
      </div>
      <calculator-quality-outcome-table
        v-if="resultHasCO"
        :crafts="materialsOutput"
      />
    </section>
  </details>
</template>

<style lang="scss" scoped>
.calculator {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;

  padding: $md;

  .skill-title {
    display: flex;
    gap: $xxs;
    align-items: center;
  }

  .skill-row {
    display: flex;
    flex-direction: column;
    gap: $sm;
    align-items: start;
    padding: $md;
    border-radius: $md;
  }

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}
</style>
