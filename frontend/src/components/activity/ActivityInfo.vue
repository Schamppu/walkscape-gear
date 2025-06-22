<script setup>
import { computed } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import KeywordDisplay from "@/components/common/KeywordDisplay.vue";
import { useSkillModifiers } from "@/utils/useSkillModifiers";
import { isEmpty } from "@/utils/isEmpty";

const props = defineProps({
  activity: Object,
  keywords: Array,
  locations: Array,
});

const {
  maxWorkEfficiency,
  workEfficiency,
  stepsPerCompletion,
  xpRewards,
  xpPerStep,
} = useSkillModifiers();

const borderClass = computed(
  () => `border-${props.activity?.relatedSkillsList[0]}`
);

const n = (value) => {
  return parseFloat(value.toFixed(2));
};

const getKeyword = (kw) => {
  const findKw = (kwId) => props.keywords.find(({ id }) => id === kwId);

  if ("keyword" in kw) {
    return findKw(kw["keyword"]);
  } else if ("keywords" in kw) {
    const { quantity, keywords } = kw;
    return keywords.map((kwId) => {
      return { ...findKw(kwId), quantity };
    });
  }
  return null;
};

const getRequirementKeywords = (requirements) => {
  if (!requirements) return [];
  return requirements
    .flatMap((requirements) => requirements)
    .filter(({ type }) => type === "distinctKeywordItemsEquipped")
    .flatMap(({ requirement }) => getKeyword(requirement));
};

const sections = computed(() => {
  const {
    id,
    workRequired,
    levelRequirementsMap,
    requiredKeywords,
    requirements,
  } = props.activity;

  const isTravel = id === "activity-travelling";

  return [
    {
      label: "Stats (current / base)",
      component: InfoBubble,
      items: [
        {
          text: `${stepsPerCompletion.value} / ${workRequired || 1000}`,
          tooltip: `${stepsPerCompletion.value} steps per action`,
          iconPath: "assets/icons/text/general_icons/steps.png",
        },
        {
          text: `${n(workEfficiency.value * 100)} / ${
            Math.round(maxWorkEfficiency.value * 100) - 100
          }%`,
          tooltip: `${Math.round(workEfficiency.value * 100)}% work efficiency`,
          iconPath: "assets/icons/text/stats/skilling/work_efficiency.png",
        },
      ],
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Skill requirements",
      component: SkillBubble,
      items: Object.entries(levelRequirementsMap || {}).map(
        ([skill, level]) => ({
          skill,
          text: level.toString(),
          tooltipText: `Requires ${level} ${skill}`,
        })
      ),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Keyword requirements",
      component: KeywordDisplay,
      items: [
        ...(requiredKeywords || []).map(getKeyword),
        ...getRequirementKeywords(requirements),
      ],
      itemProps: (keyword) => ({ keyword }),
    },
    {
      label: "XP rewards (current / base)",
      component: SkillBubble,
      items: xpRewards.value.map(({ skill, skillText, value, base }) => ({
        skill,
        text: `${n(value)} / ${n(base)}`,
        tooltipText: `Rewards ${n(value)} ${skillText} XP`,
        value,
        base,
      })),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "XP per step (real / displayed)",
      component: SkillBubble,
      items: xpPerStep.value.map(
        ({ skill, skillText, value, displayedValue }) => ({
          skill,
          text: `${n(value)} /  ${n(displayedValue)}`,
          tooltip: `Gains ${n(value)} ${skillText} XP per step`,
        })
      ),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Locations",
      component: LocationBubble,
      items: !isTravel ? props.locations : [],
      itemProps: (item) => ({ location: item }),
    },
  ].filter(({ items }) => !isEmpty(items));
});
</script>

<template>
  <section :class="['activity-info', borderClass]">
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
.activity-info {
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
