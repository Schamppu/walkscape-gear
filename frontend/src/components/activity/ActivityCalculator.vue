<script setup>
import { ref, computed, reactive, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import IconInputBubble from "../common/IconInputBubble.vue";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import WsLabel from "@/components/common/WsLabel.vue";
import { xpToLevelSkill } from "@/utils/skillXp";

const { stepsPerAction, xpPerStep, xpRewards } = useSkillModifiers();
const playerStore = usePlayerStore();

const activityStore = useActivityStore();
const { activity } = storeToRefs(activityStore);

const { skillLevels } = storeToRefs(playerStore);
const activitySkills = computed(() => Object.keys(activity.value.xpRewardsMap));

const steps = ref(0);

const actions = computed({
  get: () => Math.ceil(steps.value / stepsPerAction.value),
  set: (val) => {
    steps.value = Math.ceil(val * stepsPerAction.value);
  },
});

const skillXpStartRefs = reactive({});
const skillXpGainRefs = reactive({});
const skillXpEndRefs = reactive({});

const getXpPerStepFor = (skill) =>
  xpPerStep.value.find((o) => o.skill === skill).value;

const getXpPerActionFor = (skill) =>
  xpRewards.value.find((o) => o.skill === skill).value;

watchEffect(() => {
  const list = activitySkills.value;

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
        return Math.round(steps.value * perStep);
      },
      set: (val) => {
        actions.value = Math.ceil(val / perAction);
      },
    });

    skillXpStartRefs[s] = ref(xpToLevelSkill(skillLevels.value[s]));

    skillXpEndRefs[s] = computed({
      get: () => {
        return skillXpStartRefs[s] + skillXpGainRefs[s];
      },
      set: (val) => {
        skillXpGainRefs[s] = Math.max(0, val - skillXpStartRefs[s]);
      },
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
      </div>
      <div
        :class="['skill-row', `border-${skill}`]"
        v-for="skill in activitySkills"
        :key="skill"
      >
        <ws-label :label="skill" />
        <div class="info-row">
          <icon-input-bubble
            label="starting xp"
            :key="`${skill}-starting-xp`"
            :id="`${skill}-starting-xp`"
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
            label="end xp"
            :key="`${skill}-end-xp`"
            :id="`${skill}-end-xp`"
            :max="99999999"
            :getValue="() => skillXpEndRefs[skill]"
            :setValue="() => {}"
            @input="(val) => (skillXpEndRefs[skill] = val)"
          />
        </div>
      </div>
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
