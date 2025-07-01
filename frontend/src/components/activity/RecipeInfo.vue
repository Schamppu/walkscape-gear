<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import ServiceBubble from "@/components/common/ServiceBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import { useActivityStore } from "@/store/activity";
import { useSkillModifiers } from "@/utils/useSkillModifiers";
import { isEmpty } from "@/utils/isEmpty";
import { n } from "@/utils/number";

const activityStore = useActivityStore();
const { recipe } = storeToRefs(activityStore);
const stats = computed(() => {
  const {
    maxWorkEfficiency,
    workEfficiency,
    stepsPerCompletion,
    xpRewards,
    xpPerStep,
  } = useSkillModifiers();

  return {
    maxWorkEfficiency: maxWorkEfficiency.value,
    workEfficiency: workEfficiency.value,
    stepsPerCompletion: stepsPerCompletion.value,
    xpRewards: xpRewards.value,
    xpPerStep: xpPerStep.value,
  };
});

const levelRequirement = computed(() => {
  const [level] = recipe.value.requirements
    .map(({ requirement }) => requirement)
    .filter(({ runtimeType }) => runtimeType === "skillLevel");
  return level || { level: 1, skill: "none" };
});

const borderClass = computed(
  () => `border-${activityStore.recipe?.relatedSkills[0]}`
);

const sections = computed(() => {
  const {
    id,
    workRequired,
    levelRequirementsMap,
    requiredKeywords,
    requirements,
  } = activityStore.recipe;

  return [
    {
      label: "Services",
      component: ServiceBubble,
      items: activityStore.services,
      itemProps: (item) => ({ service: item }),
    },
  ].filter(({ items }) => !isEmpty(items));
});
</script>

<template>
  <section :class="['recipe-info', borderClass]">
    <div class="info-section">
      <div class="info-row">
        <info-bubble
          label="Steps"
          :text="`${stats.stepsPerCompletion} / ${recipe.workRequired || 1000}`"
          :tooltip="`${stats.stepsPerCompletion} steps per action`"
          iconPath="assets/icons/text/general_icons/steps.png"
        />
        <info-bubble
          label="Work Efficiency"
          :text="`${n(stats.workEfficiency * 100)} / ${
            Math.round(stats.maxWorkEfficiency * 100) - 100
          }%`"
          :tooltip="`${Math.round(
            stats.workEfficiency * 100
          )}% work efficiency`"
          iconPath="assets/icons/text/stats/skilling/work_efficiency.png"
        />
        <skill-bubble
          label="Level"
          :skill="levelRequirement.skill"
          :text="`${levelRequirement.level}`"
          :tooltip-text="`Requires ${levelRequirement.level} ${levelRequirement.skill}`"
        />
        <skill-bubble
          label="XP"
          :skill="stats.xpRewards[0].skill"
          :text="`${stats.xpRewards[0].value}`"
          :tooltip-text="`Rewards ${n(stats.xpRewards[0].value)} ${
            stats.xpRewards[0].skillText
          } XP`"
        />
        <skill-bubble
          label="XP / Step"
          :skill="stats.xpPerStep[0].skill"
          :text="`${n(stats.xpPerStep[0].value)}`"
          :tooltip-text="`Rewards ${n(stats.xpPerStep[0].value)} ${
            stats.xpRewards[0].skillText
          } XP per step`"
        />
      </div>
    </div>
    <div v-for="section in sections" class="info-section" :key="section.label">
      <ws-label :label="section.label" />
      <div class="info-row">
        <component
          v-for="(item, idx) in section.items"
          :is="section.component"
          v-bind="section.itemProps(item)"
          :key="idx"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.recipe-info {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;

  padding: $md;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: $sm;
  align-items: flex-start;

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}
</style>
